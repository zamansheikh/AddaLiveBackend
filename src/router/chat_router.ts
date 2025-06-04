import express from 'express';
import { authenticate } from '../core/middlewares/auth_middleware';
import { validateRequest } from '../core/middlewares/validate_request';
import ChatDto from '../dtos/chat/chat_dto';
import MessageRepository from '../repository/chats/messages/message_repository';
import Messages from '../models/chats/message_model';
import ConversationRepository from '../repository/chats/conversations/conversation_repository';
import conversation from '../models/chats/conversation_model';
import ChatService from '../services/chat/chat_service';
import ChatController from '../controllers/chat_controller';
import { upload } from '../core/middlewares/multer';
import EditMessageDto from '../dtos/chat/edit_message_dto';


const router = express.Router();

const messageRepo = new MessageRepository(Messages);
const conversationRepo = new ConversationRepository(conversation);

const chatSerive = new ChatService(messageRepo, conversationRepo);
const chatController = new ChatController(chatSerive);



router.post("/send-message", authenticate, upload.single("file"), validateRequest(ChatDto), chatController.sendMessage);
router.put("/seen-message", authenticate, validateRequest(ChatDto), chatController.updateSeenStatus);
router.delete("/delete-message/:messageId", authenticate, chatController.deleteMessage);
router.put("/edit-message/:messageId", authenticate, validateRequest(EditMessageDto), chatController.editMessage);
router.get("/all-message/:recieverId", authenticate, chatController.getAllMessages);

router.get("/all-conversation", authenticate, chatController.getAllConversations);
router.delete("/delete-conversation/:conversationId", authenticate, chatController.deleteConversations);


export default router;