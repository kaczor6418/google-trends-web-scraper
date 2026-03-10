import { Request, Response } from 'express';

export const listPhrases = (req: Request, res: Response) => {
  const { geo, active } = req.query;
  res.json({ message: "Listing filtered phrases", filters: { geo, active } });
};

export const updatePhrase = (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ message: `Updating phrase ${id}` });
};