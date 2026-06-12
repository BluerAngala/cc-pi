import type { Message } from "../hooks/useChat";
import { UserBubble } from "./UserBubble";
import { AssistantBubble } from "./AssistantBubble";

export function MessageItem({ message }: { message: Message }) {
  if (message.role === "user") {
    return <UserBubble text={message.content} />;
  }
  return <AssistantBubble message={message} />;
}
