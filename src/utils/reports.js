import QUESTIONS from '../constants/questions';

// --- 1. Comprehensive Script Loader (Exposes all global namespaces cleanly) ---
const loadAllPdfLibraries = () => {
  return new Promise((resolve, reject) => {
    // If everything is already present in the window object, resolve instantly
    if (window.html2pdf && window.jspdf && window.jspdf.jsPDF) {
      resolve();
      return;
    }

    // Step 1: Inject core standalone jsPDF
    const jspdfScript = document.createElement('script');
    jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    jspdfScript.async = true;

    jspdfScript.onload = () => {
      // Step 2: Inject modern AutoTable plugin (attaches directly to the newly created window.jspdf)
      const autotableScript = document.createElement('script');
      autotableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      autotableScript.async = true;

      autotableScript.onload = () => {
        // Step 3: Inject html2pdf for the Bangla engine
        const html2pdfScript = document.createElement('script');
        html2pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        html2pdfScript.async = true;
        
        html2pdfScript.onload = () => resolve();
        html2pdfScript.onerror = () => reject(new Error('html2pdf failed to load'));
        document.body.appendChild(html2pdfScript);
      };
      autotableScript.onerror = () => reject(new Error('jspdf-autotable failed to load'));
      document.body.appendChild(autotableScript);
    };
    jspdfScript.onerror = () => reject(new Error('jsPDF core failed to load'));
    document.body.appendChild(jspdfScript);
  });
};

// --- Excel / CSV Export (Unchanged & Working) ---
export const handleExportExcel = (submissions, notify) => {
  if (!submissions || submissions.length === 0) {
    notify('ডাউনলোড করার মতো কোনো তথ্য নেই।', 'error');
    return;
  }

  const headers = ['Name', 'EMP. ID', 'Branch', 'Date', 'Marks', ...Array.from({ length: 20 }, (_, i) => `Q${i + 1}`)];
  const csvRows = [headers.join(',')];

  submissions.forEach((sub) => {
    const row = [
      sub.userName || '',
      sub.userId || '',
      sub.userBranch || '',
      sub.date || '',
      sub.marks !== undefined ? sub.marks : 0,
      ...Array.from({ length: 20 }, (_, i) => sub[`q${i + 1}`] || '')
    ].map((field) => `"${(field ?? '').toString().replace(/"/g, '""')}"`);

    csvRows.push(row.join(','));
  });

  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Tajweed_Quiz_Report_${new Date().toLocaleDateString('en-GB')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  notify('CSV ফাইল সফলভাবে ডাউনলোড হয়েছে।', 'success');
};

// --- 2. Summary PDF Engine ---
export const generateSummaryPDF = async (submissions, notify) => {
  if (!submissions || submissions.length === 0) {
    notify('No data found to export.', 'error');
    return;
  }

  try {
    // Await the new robust multi-script injector
    await loadAllPdfLibraries(); 
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header Layout
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(27, 77, 26);
    doc.text('Islami Bank Training and Research Academy', 105, 15, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text('13A/2A, Block # B, Babar Road, Mohammadpur, Dhaka-1207, Bangladesh', 105, 21, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 37);
    doc.text('Tajweed Quiz - Consolidated Result Sheet', 105, 29, { align: 'center' });

    // doc.setFont('Helvetica', 'normal');
    // doc.setFontSize(9);
    // doc.setTextColor(107, 114, 128);
    // doc.text(`Date Generated: ${new Date().toLocaleDateString('en-GB')}`, 105, 35, { align: 'center' });

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    // doc.text(`Batch: ${submissions[0].batch}`, 14, 34)
    doc.text(`Exam Date: ${submissions[0].date}`, 14, 40)
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 152, 40)

    // Explicit Type Conversion to Strings
    const tableHeaders = [['SL', 'Emp. ID', 'Name', 'Branch', 'Written (10)', 'Viva (5)', 'Total Marks (15)']];
    const tableRows = submissions.map((sub, index) => [
      String(index + 1),
      String(sub.userId || '---'),
      String(sub.userName || '---'),
      String(sub.userBranch || '---'),
      String(sub.marks !== undefined ? sub.marks : '---'),
      String(sub.viva_marks !== undefined ? sub.viva_marks : '---'),
      String(sub.total_marks !== undefined ? sub.total_marks : '---')
    ]);

    // Render Table using the newly exposed global plugin namespace
    doc.autoTable({
      startY: 44,
      head: tableHeaders,
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [27, 77, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 20 },
        2: { fontStyle: 'bold', textColor: [17, 24, 37] },
        3: { cellWidth: 45 },
        4: { halign: 'center', fontStyle: 'bold', textColor: [27, 77, 26], cellWidth: 25 }
      },
      styles: { fontSize: 9, cellPadding: 3, font: 'Helvetica' },
      margin: { bottom: 35 }
    });

    // Handle Signature Segment
    let finalY = doc.lastAutoTable.finalY + 20;
    if (finalY > 255) {
      doc.addPage();
      finalY = 35;
    }

    doc.setDrawColor(75, 85, 99);
    doc.setLineWidth(0.4);
    doc.line(140, finalY, 190, finalY);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 77, 26);
    doc.text('Talha Zubaer Siddique Al-Quraishy', 165, finalY + 5, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Instructor', 165, finalY + 10, { align: 'center' });

    doc.save(`IBTRA_Consolidated_Results_${Date.now()}.pdf`);
    notify('Summary PDF downloaded successfully.', 'success');
  } catch (err) {
    console.error('Summary PDF Engine Crash Log:', err);
    notify('Failed to generate Summary PDF.', 'error');
  }
};

export const generateIndividualPDF = async (dataArray, notify) => {
  if (!dataArray || dataArray.length === 0) {
    notify("ডাউনলোড করার মতো কোনো তথ্য নেই।", "error");
    return;
  }

  const container = document.createElement("div");
  // Set clear box-sizing and explicit A4 width in pixels at standard 96 DPI
  container.style.width = "794px";
  container.style.boxSizing = "border-box";
  container.style.margin = "0 auto";
  container.style.backgroundColor = "#fff";
  document.body.appendChild(container);

  dataArray.forEach((sub, index) => {
    const page = document.createElement("div");
    page.style.width = "794px";
    page.style.boxSizing = "border-box";
    page.style.padding = "25px";
    if (index < dataArray.length - 1) page.style.pageBreakAfter = "always";
    
    page.innerHTML = `
        <div style="border: 3px solid #1B4D1A; border-radius: 12px; padding: 25px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; position: relative; min-height: 262mm; box-sizing: border-box; background-color: #fff; box-shadow: inset 0 0 20px rgba(27,77,26,0.05);">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                <h1 style="font-size: 18px; margin: 0; color: #1B4D1A; font-weight: 900; text-transform: uppercase;">Islami Bank Training and Research Academy</h1>
                <p style="font-size: 10px; color: #4b5563; margin-top: 2px; font-weight: bold;">13A/2A, Block # B, Babar Road, Mohammadpur, Dhaka-1207</p>
                <h2 style="font-size: 14px; margin: 10px 0; color: #111827; font-weight: bold; background: #f0fdf4; display: inline-block; padding: 5px 15px; border-radius: 20px; border: 1px solid #1B4D1A;">Tajweed Quiz Evaluation Report</h2>
            </div>
            
            <!-- Replaced CSS Grid with a robust Flex layout for HTML2Canvas compatibility -->
            <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6; font-size: 11px; box-sizing: border-box;">
                <div style="flex: 1;">
                    <p style="margin: 2px 0;"><strong>Student Name:</strong> <span style="color: #111827; font-weight: bold;">${sub.userName || ''}</span></p>
                    <p style="margin: 2px 0;"><strong>Student ID:</strong> <span style="font-family: monospace; font-weight: bold;">${sub.userId || ''}</span></p>
                    <p style="margin: 2px 0;"><strong>Branch:</strong> ${sub.userBranch || 'Not Specified'}</p>
                </div>
                <div style="flex: 1; text-align: right;">
                    <p style="margin: 2px 0;"><strong>Evaluation Date:</strong> ${sub.date || new Date().toLocaleDateString()}</p>
                    <p style="margin: 2px 0; font-size: 13px;"><strong>Score Secured:</strong> <span style="font-size: 16px; font-weight: bold; color: #1B4D1A;">${sub.marks || 0}</span> / 10</p>
                </div>
            </div>

            <h3 style="font-size: 12px; color: #1B4D1A; margin: 0 0 10px 0; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; font-weight: bold;">Detailed Question Response Sheet</h3>
            
            <div style="margin-top: 5px;">
                ${QUESTIONS.map((q, i) => {
                  const studentAnswer = sub['q' + (i + 1)];
                  const isCorrect = studentAnswer && studentAnswer.trim() === q.correctAnswer.trim();
                  return `
                    <div style="margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; font-size: 10px; line-height: 1.4;">
                        <p style="font-weight: bold; color: #374151; margin: 0 0 3px 0;">Q${i+1}: ${q.question}</p>
                        <div style="display: block; padding: 5px; border-radius: 4px; background: ${isCorrect ? '#f0fdf4' : '#fef2f2'}; border-left: 3px solid ${isCorrect ? '#10b981' : '#ef4444'}; box-sizing: border-box;">
                            <p style="margin: 0; color: #1f2937;"><strong>Given Choice:</strong> ${studentAnswer || '<span style="color:#ef4444; font-weight: bold;">No response recorded</span>'}</p>
                            ${!isCorrect ? `<p style="margin: 1px 0 0 0; color: #1B4D1A;"><strong>Expected Key:</strong> ${q.correctAnswer}</p>` : ''}
                        </div>
                    </div>
                  `;
                }).join('')}
            </div>

            <div style="position: absolute; bottom: 25px; right: 25px; text-align: center;">
                <div style="border-top: 1.5px solid #4b5563; width: 170px; padding-top: 4px; font-size: 10px; font-weight: bold; color: #4b5563;">Evaluator Signature</div>
                <div style="font-size: 8px; color: #9ca3af; margin-top: 2px;">Al-Quran and Tazweed Division</div>
            </div>
        </div>
    `;
    container.appendChild(page);
  });

  const opt = {
    margin: 0,
    filename: `Tajweed_Individual_Report_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: 794,
      windowWidth: 794,
      x: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await loadAllPdfLibraries();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    await window.html2pdf().from(container).set(opt).save();
    document.body.removeChild(container);
    notify("ব্যক্তিগত পিডিএফ সফলভাবে ডাউনলোড হয়েছে।", "success");
  } catch (err) {
    console.error('Individual PDF Engine Crash Log:', err);
    if (container.parentNode) container.parentNode.removeChild(container);
    notify("ব্যক্তিগত পিডিএফ তৈরি করা যায়নি।", "error");
  }
};