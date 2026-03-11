import * as pdfjsLib from 'pdfjs-dist';
import logger from './logger';

// Configure PDF.js worker — use Vite-compatible import for pdfjs-dist v5 (.mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

/**
 * Extract text content from a PDF file
 * @param {string} pdfUrl - URL of the PDF file (Firebase Storage URL or local)
 * @param {number} maxPages - Maximum number of pages to extract (default: 10 for performance)
 * @returns {Promise<string>} Extracted text content
 */
export const extractTextFromPDF = async (pdfUrl, maxPages = 50) => {
    try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        const totalPages = Math.min(pdf.numPages, maxPages);
        let fullText = '';

        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Combine text items into a single string
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        // Clean up extracted text — preserve paragraph breaks for AI readability
        const cleanedText = fullText
            .replace(/[ \t]+/g, ' ')  // Collapse horizontal whitespace only
            .replace(/\n{3,}/g, '\n\n')  // Limit excessive blank lines to one
            .trim();

        return cleanedText;
    } catch (error) {
        logger.error('Error extracting PDF text:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Extract text and create a summary for AI prompt
 * @param {string} pdfUrl - URL of the PDF file
 * @param {number} maxChars - Maximum characters to extract (default: 5000)
 * @returns {Promise<object>} Object with fullText and summary
 */
export const extractPDFForAI = async (pdfUrl, maxChars = 15000) => {
    try {
        const fullText = await extractTextFromPDF(pdfUrl);

        // If text is too long, truncate for AI processing
        const truncatedText = fullText.length > maxChars
            ? fullText.substring(0, maxChars) + '...'
            : fullText;

        return {
            fullText,
            truncatedText,
            wordCount: fullText.split(/\s+/).length,
            charCount: fullText.length
        };
    } catch (error) {
        logger.error('Error preparing PDF for AI:', error);
        throw error;
    }
};

/**
 * Validate if URL is accessible for PDF extraction
 * @param {string} url - PDF URL to validate
 * @returns {Promise<boolean>} True if accessible
 */
export const validatePDFUrl = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        logger.error('PDF URL validation failed:', error);
        return false;
    }
};
