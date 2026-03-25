export interface BoardSummary {
  _id: string;
  name: string;
  description: string | null;
  columnOrder: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CardSummary {
  _id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
}

export interface BoardDetail {
  board: BoardSummary;
  columns: Array<{
    _id: string;
    boardId: string;
    name: string;
    cardOrder: string[];
  }>;
  cards: CardSummary[];
}
