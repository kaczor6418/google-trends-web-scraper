import { Request, Response } from 'express';
import * as DictionaryService from '../services/dictionary.service';
import { DictionaryType } from '../../generated/prisma-client';

const validTypes = Object.values(DictionaryType);

export const addWord = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { word } = req.body;

    if (!validTypes.includes(type as DictionaryType)) {
      return res.status(400).json({ error: "Invalid dictionary type" });
    }
    if (!word?.trim()) return res.status(400).json({ error: "Missing word" });

    const result = await DictionaryService.createWord(type as DictionaryType, word);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const listWords = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!validTypes.includes(type as DictionaryType)) {
      return res.status(400).json({ error: "Invalid dictionary type" });
    }

    const words = await DictionaryService.getWordsByType(type as DictionaryType);
    res.json(words);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const editWord = async (req: Request, res: Response) => {
  try {
    const { id, type } = req.params;
    const { word } = req.body;

    if (!word?.trim()) return res.status(400).json({ error: "Missing word" });

    const result = await DictionaryService.updateWord(BigInt(id), type as DictionaryType, word);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: "Word not found or update failed" });
  }
};

export const removeWord = async (req: Request, res: Response) => {
  try {
    const { id, type } = req.params;
    await DictionaryService.deleteWord(BigInt(id), type as DictionaryType);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(404).json({ error: "Word not found" });
  }
};

export const bulkAddWords = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { words } = req.body;

    if (!Array.isArray(words) || !words.length) {
      return res.status(400).json({ error: "Missing words[]" });
    }

    const result = await DictionaryService.bulkCreateWords(type as DictionaryType, words);
    res.status(201).json({ inserted: result.count, received: words.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};