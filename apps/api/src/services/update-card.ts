import type { CardPlacementInput, CardUpdateInput } from "@kanbanana/shared";
import type { ClientSession, HydratedDocument } from "mongoose";
import { Types } from "mongoose";
import { CardModel, ColumnModel } from "../models/index.js";
import type { Card } from "../models/card.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { objectIdEquals, sameIds, toObjectIds } from "../lib/object-id.js";
import { inTransaction } from "../lib/transaction.js";

// Moves a card to another column.
export function moveCard(
  cardId: Types.ObjectId,
  placement: CardPlacementInput,
) {
  return inTransaction(async (session) => {
    const card = await findActiveCard(cardId, session);
    const columns = await placeCard(card, placement, session);
    await card.save({ session });
    return { card, ...columns };
  });
}

// Applies text changes and an optional placement as one atomic change, so a
// rejected placement never leaves a half-updated card behind.
export function updateCard(cardId: Types.ObjectId, input: CardUpdateInput) {
  const { title, description, placement } = input;
  return inTransaction(async (session) => {
    const card = await findActiveCard(cardId, session);

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (placement) await placeCard(card, placement, session);

    await card.save({ session });
    return card;
  });
}

async function findActiveCard(cardId: Types.ObjectId, session: ClientSession) {
  const card = await CardModel.findOne({
    _id: cardId,
    deletedAt: null,
  }).session(session);

  if (!card) {
    throw notFound("Card not found");
  }

  return card;
}

// Validates that the submitted orders describe exactly the cards in the
// affected columns, then writes both column orders and the card's new column.
// The caller saves the card.
async function placeCard(
  card: HydratedDocument<Card>,
  placement: CardPlacementInput,
  session: ClientSession,
) {
  const sourceId = new Types.ObjectId(placement.sourceColumnId);
  const destinationId = new Types.ObjectId(placement.destinationColumnId);
  const sameColumn = objectIdEquals(sourceId, destinationId);

  if (!objectIdEquals(card.columnId, sourceId)) {
    throw badRequest("Card does not belong to the source column");
  }

  const sourceColumn = await ColumnModel.findOne({
    _id: sourceId,
    deletedAt: null,
  }).session(session);
  const destinationColumn = sameColumn
    ? sourceColumn
    : await ColumnModel.findOne({
        _id: destinationId,
        deletedAt: null,
      }).session(session);

  if (!sourceColumn || !destinationColumn) {
    throw notFound("One or more columns were not found");
  }

  if (!objectIdEquals(sourceColumn.boardId, destinationColumn.boardId)) {
    throw badRequest(
      "Source and destination columns must belong to the same board",
    );
  }

  const sourceCards = await CardModel.find({
    _id: { $in: sourceColumn.cardOrder },
    columnId: sourceColumn._id,
    boardId: sourceColumn.boardId,
    deletedAt: null,
  }).session(session);
  const destinationCards = sameColumn
    ? sourceCards
    : await CardModel.find({
        _id: { $in: destinationColumn.cardOrder },
        columnId: destinationColumn._id,
        boardId: destinationColumn.boardId,
        deletedAt: null,
      }).session(session);

  const remainingSourceCards = sourceCards.filter(
    (sourceCard) => !objectIdEquals(sourceCard._id, card._id),
  );
  // Within one column the moved card is already part of the destination.
  const finalDestinationIds = sameColumn
    ? destinationCards.map((item) => item._id)
    : [...destinationCards.map((item) => item._id), card._id];

  if (
    !sameIds(
      remainingSourceCards.map((sourceCard) => sourceCard._id),
      placement.sourceCardOrder,
    )
  ) {
    throw badRequest("sourceCardOrder must match the remaining source cards");
  }

  if (!sameIds(finalDestinationIds, placement.destinationCardOrder)) {
    throw badRequest(
      "destinationCardOrder must match the destination cards after the move",
    );
  }

  if (!sameColumn) {
    sourceColumn.cardOrder = toObjectIds(placement.sourceCardOrder);
    await sourceColumn.save({ session });
  }
  destinationColumn.cardOrder = toObjectIds(placement.destinationCardOrder);
  await destinationColumn.save({ session });
  card.columnId = destinationColumn._id;

  return { sourceColumn, destinationColumn };
}
