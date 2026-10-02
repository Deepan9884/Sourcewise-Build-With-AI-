/**
 * fileReader.js — Client-side file reading utility.
 * - Extracts clean text from plain text formats (.txt, .md, .csv, .json, .py, etc.)
 * - Encodes binary files (.pdf, .docx, images) as base64 for Gemini multimodal document processing
 */

export async function readFilePayload(file) {
  if (!file) {
    return { text_content: '', file_base64: '', mime_type: 'application/octet-stream' };
  }

  const name = file.name || '';
  const ext = name.split('.').pop().toLowerCase();
  const textExtensions = ['txt', 'md', 'json', 'csv', 'py', 'js', 'jsx', 'ts', 'tsx', 'html', 'c', 'cpp', 'java', 'xml'];

  if (textExtensions.includes(ext)) {
    try {
      const text = await file.text();
      return {
        text_content: text.slice(0, 100000),
        file_base64: null,
        mime_type: 'text/plain',
      };
    } catch (_) {}
  }

  // Read binary / PDF / images as base64
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result;
        let base64 = '';
        let mime = file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream');
        if (typeof result === 'string') {
          if (result.includes(',')) {
            base64 = result.split(',')[1];
            const mimeMatch = result.match(/^data:(.*?);base64,/);
            if (mimeMatch) mime = mimeMatch[1];
          } else {
            base64 = result;
          }
        }
        resolve({
          text_content: '',
          file_base64: base64,
          mime_type: mime || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
        });
      } catch (err) {
        resolve({ text_content: '', file_base64: '', mime_type: 'application/pdf' });
      }
    };
    reader.onerror = () => resolve({ text_content: '', file_base64: '', mime_type: 'application/pdf' });
    reader.readAsDataURL(file);
  });
}
