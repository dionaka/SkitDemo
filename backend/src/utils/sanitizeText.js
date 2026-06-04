const COMMENT_MAX_LENGTH = 500;

function sanitizeCommentContent(raw, maxLen = COMMENT_MAX_LENGTH) {
  let text = String(raw ?? '');
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\bon\w+\s*=/gi, '');
  text = text.trim();
  if (text.length > maxLen) {
    text = text.slice(0, maxLen);
  }
  return text;
}

module.exports = {
  COMMENT_MAX_LENGTH,
  sanitizeCommentContent,
};
