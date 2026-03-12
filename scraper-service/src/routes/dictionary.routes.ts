import { Router } from 'express';
import * as DictionaryController from '../controllers/dictionary.controller';

const router = Router();

router.get("/:type", DictionaryController.listWords);
router.post("/:type", DictionaryController.addWord);
router.post("/:type/bulk", DictionaryController.bulkAddWords);
router.put("/:type/:id", DictionaryController.editWord);
router.delete("/:type/:id", DictionaryController.removeWord);

export default router;