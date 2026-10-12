import jsPDF from 'jspdf';
import type { AssessmentReviewResponse, SavedAnswer } from '@/apis/vendorAssessments';

interface GeneratePDFOptions {
  assessmentName: string;
  assessorName: string;
  vendorName?: string;
  submittedAt: string;
  questions: SavedAnswer[];
}

export function generateAssessmentPDF(options: GeneratePDFOptions): void {
  const { assessmentName, assessorName, vendorName, submittedAt, questions } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Helper function to wrap text and return lines
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = wrapText(assessmentName, contentWidth, 18);
  titleLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 8;
  });
  yPosition += 5;

  // Meta information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (vendorName) {
    doc.text(`Vendor: ${vendorName}`, margin, yPosition);
    yPosition += 6;
  }

  doc.text(`Assessor: ${assessorName}`, margin, yPosition);
  yPosition += 6;

  doc.text(`Submitted: ${submittedAt}`, margin, yPosition);
  yPosition += 15;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Questions
  questions.forEach((question, index) => {
    // Check if we need a new page (estimate space needed)
    checkPageBreak(60);

    // Question number and text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const questionText = `${index + 1}. ${question.questionText}`;
    const questionLines = wrapText(questionText, contentWidth, 12);

    questionLines.forEach((line: string) => {
      checkPageBreak(8);
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 4;

    // Answer section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12); // Orange color
    doc.text('ANSWER', margin, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Get display value for answer
    let answerDisplay = question.answer || 'No answer provided';
    if ((question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTIPLE_CHOICE') && question.options) {
      const selectedIds = question.answer?.split(',').map(id => id.trim()) || [];
      const selectedOptions = selectedIds
        .map(id => {
          const option = question.options?.find(opt => String(opt.id) === id);
          return option?.option || id;
        })
        .join(', ');
      answerDisplay = selectedOptions || 'No answer provided';
    }

    const answerLines = wrapText(answerDisplay, contentWidth, 10);
    answerLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 4;

    // Explanation section (if available)
    if (question.explanation) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text('EXPLANATION', margin, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const explanationLines = wrapText(question.explanation, contentWidth, 10);
      explanationLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 4;
    }

    // Supporting file (if available)
    if (question.supportingFile) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text('SUPPORTING FILE', margin, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(question.supportingFile.name, margin, yPosition);
      yPosition += 5;
      doc.setTextColor(0, 0, 0);
    }

    // Answer file (if available)
    if (question.answerFile) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text('ANSWER FILE', margin, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(question.answerFile.name, margin, yPosition);
      yPosition += 5;
      doc.setTextColor(0, 0, 0);
    }

    // Add separator line
    yPosition += 5;
    checkPageBreak(10);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
  });

  // Save the PDF
  const fileName = `${assessmentName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
