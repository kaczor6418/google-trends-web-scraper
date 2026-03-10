import { Router } from 'express';
import * as PhraseController from '../controllers/phrases.controller';

const router = Router();

router.get('/', PhraseController.listPhrases);
router.patch('/:id', PhraseController.updatePhrase);

export default router;