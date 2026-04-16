// PDF parsing is done client-side using pdfjs-dist
// DOCX and TXT are sent to the server for parsing

export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    text += pageText + '\n'
  }

  return text.trim()
}

export async function parseDocxOrTxt(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/parse', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json() as { error: string }
    throw new Error(err.error || 'Failed to parse file')
  }
  const data = await res.json() as { text: string }
  return data.text
}

export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    return parsePDF(file)
  } else if (name.endsWith('.docx') || name.endsWith('.txt')) {
    return parseDocxOrTxt(file)
  }
  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.')
}
