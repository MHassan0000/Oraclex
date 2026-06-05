export function getReportErrorStatus(message: string): number {
  if (
    message === "Report not found" ||
    message === "Report file not found" ||
    message === "Conversation not found"
  ) {
    return 404;
  }

  if (
    message.startsWith("No ready documents") ||
    message.startsWith("One or more selected documents") ||
    message.startsWith("Select ") ||
    message.startsWith("Start or open a chat")
  ) {
    return 400;
  }

  return 500;
}
