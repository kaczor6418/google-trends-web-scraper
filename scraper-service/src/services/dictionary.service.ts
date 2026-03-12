import { prisma } from '../lib/prisma';
import { DictionaryType } from '@prisma/client';

export const createWord = async (type: DictionaryType, word: string) => {
  const normalizedWord = word.trim().toLowerCase();
  
  return await prisma.dictionaryWord.upsert({
    where: {
      type_word: { type, word: normalizedWord }
    },
    update: {}, // Do nothing on conflict
    create: { type, word: normalizedWord }
  });
};

export const getWordsByType = async (type: DictionaryType) => {
  return await prisma.dictionaryWord.findMany({
    where: { type },
    orderBy: { word: 'asc' },
    select: { id: true, word: true }
  });
};

export const updateWord = async (id: bigint, type: DictionaryType, word: string) => {
  return await prisma.dictionaryWord.update({
    where: { id, type },
    data: { 
      word: word.trim().toLowerCase(),
      updatedAt: new Date()
    }
  });
};

export const deleteWord = async (id: bigint, type: DictionaryType) => {
  return await prisma.dictionaryWord.delete({
    where: { id, type }
  });
};

export const bulkCreateWords = async (type: DictionaryType, words: string[]) => {
  const cleanWords = [...new Set(words.map(w => w.trim().toLowerCase()).filter(Boolean))];
  
  const data = cleanWords.map(word => ({ type, word }));
  
  return await prisma.dictionaryWord.createMany({
    data,
    skipDuplicates: true,
  });
};