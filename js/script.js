/**
 * ITPS Tariff Calculator — Application Logic
 * India Post · International Tracked Packet Service
 */

/* ============================================================
   INITIALISATION
   ============================================================ */

const selectEl = document.getElementById('country');

/** Populate the country dropdown from TARIFF_DATA */
(function populateDropdown() {
  TARIFF_DATA.forEach(function (entry) {
    const opt = document.createElement('option');
    opt.value = entry.country;
    opt.textContent = entry.country;
    selectEl.appendChild(opt);
  });
})();

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Return the max weight in grams for a given maxWeight string.
 * @param {string} maxWeight  e.g. "2 kg" or "5 kg"
 * @returns {number}
 */
function getMaxWeightGrams(maxWeight) {
  return maxWeight.includes('5') ? 5000 : 2000;
}

/**
 * Format a number as Indian Rupee string.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return 'Rs.' + n.toFixed(2);
}

/** Flash a red border on an element briefly. */
function flashError(el) {
  el.style.borderColor = '#c0392b';
  setTimeout(function () { el.style.borderColor = ''; }, 1500);
}

/* ============================================================
   EVENT HANDLERS
   ============================================================ */

/** Called when the country dropdown changes. */
function onCountryChange() {
  const val = selectEl.value;
  const weightInfoEl = document.getElementById('weightInfo');
  const maxDisplayEl = document.getElementById('maxWeightDisplay');

  if (val) {
    const entry = TARIFF_DATA.find(function (d) { return d.country === val; });
    maxDisplayEl.textContent = entry.maxWeight;
    weightInfoEl.classList.add('visible');
    onWeightInput(); // re-validate current weight if present
  } else {
    weightInfoEl.classList.remove('visible');
    document.getElementById('weightWarning').classList.remove('visible');
  }

  // Hide stale results when destination changes
  document.getElementById('results').classList.remove('visible');
  document.getElementById('btnPdf').classList.remove('active');
  lastCalc = null;
}

/** Called on every keystroke in the weight field. */
function onWeightInput() {
  const val = selectEl.value;
  const weightVal = parseInt(document.getElementById('weight').value, 10);
  const warningEl = document.getElementById('weightWarning');
  const warningTextEl = document.getElementById('weightWarningText');

  if (!val || !weightVal || isNaN(weightVal)) {
    warningEl.classList.remove('visible');
    return;
  }

  const entry = TARIFF_DATA.find(function (d) { return d.country === val; });
  const maxGrams = getMaxWeightGrams(entry.maxWeight);

  if (weightVal > maxGrams) {
    warningTextEl.textContent =
      'Exceeds maximum limit of ' + entry.maxWeight + ' for ' + val;
    warningEl.classList.add('visible');
  } else {
    warningEl.classList.remove('visible');
  }
}

/* ============================================================
   CALCULATION
   ============================================================ */

/** Stores the last successful calculation result for PDF export. */
let lastCalc = null;

/** Main calculate function — triggered by button click or Enter key. */
function calculate() {
  const countryVal = selectEl.value;
  const weightInput = document.getElementById('weight');
  const weightVal = parseInt(weightInput.value, 10);

  // Validate country
  if (!countryVal) {
    selectEl.focus();
    flashError(selectEl);
    return;
  }

  // Validate weight
  if (!weightVal || isNaN(weightVal) || weightVal < 1) {
    weightInput.focus();
    flashError(weightInput);
    return;
  }

  const entry = TARIFF_DATA.find(function (d) { return d.country === countryVal; });
  const maxGrams = getMaxWeightGrams(entry.maxWeight);

  if (weightVal > maxGrams) return; // warning already shown

  /* ---- Core tariff calculation ---- */
  const baseTariff = entry.first50;

  // Every 50g or part thereof BEYOND the first 50g
  let additionalChunks = 0;
  let additionalCharge = 0;
  if (weightVal > 50) {
    additionalChunks = Math.ceil((weightVal - 50) / 50);
    additionalCharge = additionalChunks * entry.additional;
  }

  const subtotal = baseTariff + additionalCharge;
  const gst      = subtotal * 0.18;
  const total    = subtotal + gst;

  /* ---- Save for PDF ---- */
  lastCalc = {
    countryVal,
    weightVal,
    baseTariff,
    additionalChunks,
    additionalCharge,
    data: entry,
    subtotal,
    gst,
    total,
  };

  /* ---- Update DOM ---- */
  document.getElementById('baseTariffVal').textContent  = fmt(baseTariff);
  document.getElementById('baseTariffNote').textContent = 'Rs.' + entry.first50 + ' for first 50g';

  const addRow = document.getElementById('additionalRow');
  if (additionalChunks > 0) {
    document.getElementById('additionalVal').textContent  = fmt(additionalCharge);
    document.getElementById('additionalNote').textContent =
      additionalChunks + ' x Rs.' + entry.additional +
      ' (' + (weightVal - 50) + 'g extra — ' +
      additionalChunks + ' slab' + (additionalChunks > 1 ? 's' : '') + ')';
    addRow.style.display = 'flex';
  } else {
    addRow.style.display = 'none';
  }

  document.getElementById('subtotalVal').textContent = fmt(subtotal);
  document.getElementById('gstVal').textContent      = fmt(gst);
  document.getElementById('totalVal').textContent    = fmt(total);

  // Breakdown lines
  document.getElementById('bLine1').innerHTML =
    '<span>Base (first 50g)</span><span>Rs.' + baseTariff + '.00</span>';

  if (additionalChunks > 0) {
    document.getElementById('bLine2').innerHTML =
      '<span>+ ' + additionalChunks + ' add. slab(s) x Rs.' + entry.additional + '</span>' +
      '<span>Rs.' + additionalCharge + '.00</span>';
    document.getElementById('bLine3').innerHTML =
      '<span>+ GST 18% on Rs.' + subtotal + '</span>' +
      '<span>Rs.' + gst.toFixed(2) + '</span>';
  } else {
    document.getElementById('bLine2').innerHTML =
      '<span>+ GST 18% on Rs.' + subtotal + '</span>' +
      '<span>Rs.' + gst.toFixed(2) + '</span>';
    document.getElementById('bLine3').innerHTML = '<span></span><span></span>';
  }

  // Animate results into view
  const resultsEl = document.getElementById('results');
  resultsEl.classList.remove('visible');
  void resultsEl.offsetWidth; // force reflow for animation replay
  resultsEl.classList.add('visible');

  // Reveal PDF button
  document.getElementById('btnPdf').classList.add('active');
}

// Enter key triggers calculate
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') calculate();
});

/* ============================================================
   PDF EXPORT
   ============================================================ */

/**
 * Build the inner HTML of the off-screen PDF receipt template.
 * Uses only inline styles + web-safe fonts for reliable canvas capture.
 *
 * @param {object} c  — lastCalc object
 * @returns {string}  — HTML string
 */
function buildPdfTemplate(c) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const addRowHtml = c.additionalChunks > 0
    ? '<tr>' +
        '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-size:12px;color:#3d3d5c;">' +
          'Additional Weight Charge' +
          '<div style="font-size:10px;color:#888;margin-top:2px;">' +
            c.additionalChunks + ' x Rs.' + c.data.additional +
            ' (' + (c.weightVal - 50) + 'g extra &rarr; ' +
            c.additionalChunks + ' slab' + (c.additionalChunks > 1 ? 's' : '') + ')' +
          '</div>' +
        '</td>' +
        '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-family:monospace;font-size:14px;color:#1a1a2e;font-weight:600;text-align:right;">' +
          'Rs.' + c.additionalCharge + '.00' +
        '</td>' +
      '</tr>'
    : '';

  const bLine2 = c.additionalChunks > 0
    ? '<tr>' +
        '<td style="padding:3px 0;font-size:11px;color:#555;font-family:monospace;">+ ' + c.additionalChunks + ' add. slab(s) &times; Rs.' + c.data.additional + '</td>' +
        '<td style="padding:3px 0;font-size:11px;color:#1a1a2e;font-family:monospace;text-align:right;font-weight:600;">Rs.' + c.additionalCharge + '.00</td>' +
      '</tr>'
    : '<tr>' +
        '<td style="padding:3px 0;font-size:11px;color:#555;font-family:monospace;">+ GST 18% on Rs.' + c.subtotal + '</td>' +
        '<td style="padding:3px 0;font-size:11px;color:#1a6b3c;font-family:monospace;text-align:right;font-weight:600;">Rs.' + c.gst.toFixed(2) + '</td>' +
      '</tr>';

  const bLine3 = c.additionalChunks > 0
    ? '<tr>' +
        '<td style="padding:3px 0;font-size:11px;color:#555;font-family:monospace;">+ GST 18% on Rs.' + c.subtotal + '</td>' +
        '<td style="padding:3px 0;font-size:11px;color:#1a6b3c;font-family:monospace;text-align:right;font-weight:600;">Rs.' + c.gst.toFixed(2) + '</td>' +
      '</tr>'
    : '';

  return (
    '<div style="background:#f5f0e8;width:560px;font-family:Arial,Helvetica,sans-serif;padding:0;overflow:hidden;">' +

      /* Top colour strip */
      '<div style="height:10px;background:repeating-linear-gradient(90deg,#c0392b 0,#c0392b 16px,#f5f0e8 16px,#f5f0e8 20px,#1a4a7a 20px,#1a4a7a 36px,#f5f0e8 36px,#f5f0e8 40px);"></div>' +

      '<div style="padding:32px 40px 28px;">' +

        /* Header */
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a2e;padding-bottom:20px;margin-bottom:24px;">' +
          '<div>' +
            '<div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#c0392b;background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.3);padding:3px 8px;display:inline-block;margin-bottom:8px;font-family:monospace;">India Post &middot; International</div>' +
            '<div style="font-size:24px;font-weight:700;color:#1a1a2e;line-height:1.1;font-family:Georgia,serif;">ITPS <span style="color:#c0392b;">Tariff</span> Receipt</div>' +
            '<div style="font-size:11px;color:#3d3d5c;margin-top:5px;">International Tracked Packet Service</div>' +
          '</div>' +
          '<div style="text-align:center;border:2.5px solid #c0392b;padding:8px 14px;min-width:78px;">' +
            '<div style="font-size:20px;line-height:1;">&#9993;</div>' +
            '<div style="font-size:7px;color:#c0392b;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;font-family:monospace;">India Post</div>' +
          '</div>' +
        '</div>' +

        /* Shipment summary cards */
        '<div style="display:flex;gap:16px;margin-bottom:22px;">' +
          '<div style="flex:1;background:white;border:1px solid #e8e0cc;border-bottom:2px solid #1a1a2e;padding:10px 14px;">' +
            '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#3d3d5c;font-family:monospace;margin-bottom:4px;">Destination Country</div>' +
            '<div style="font-size:14px;font-weight:600;color:#1a1a2e;">' + c.countryVal + '</div>' +
          '</div>' +
          '<div style="flex:1;background:white;border:1px solid #e8e0cc;border-bottom:2px solid #1a1a2e;padding:10px 14px;">' +
            '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#3d3d5c;font-family:monospace;margin-bottom:4px;">Packet Weight</div>' +
            '<div style="font-size:14px;font-weight:600;color:#1a1a2e;">' + c.weightVal + ' grams</div>' +
          '</div>' +
          '<div style="flex:1;background:rgba(26,74,122,0.07);border:1px solid rgba(26,74,122,0.2);border-left:3px solid #1a4a7a;padding:10px 14px;">' +
            '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#3d3d5c;font-family:monospace;margin-bottom:4px;">Max Permitted</div>' +
            '<div style="font-size:14px;font-weight:600;color:#1a4a7a;">' + c.data.maxWeight + '</div>' +
          '</div>' +
        '</div>' +

        /* Breakdown heading */
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
          '<div style="font-size:14px;font-weight:600;color:#1a1a2e;font-family:Georgia,serif;">Postage Breakdown</div>' +
          '<div style="font-size:8px;letter-spacing:2px;color:#1a6b3c;background:rgba(26,107,60,0.1);border:1px solid rgba(26,107,60,0.3);padding:3px 8px;font-family:monospace;text-transform:uppercase;">&#10003; Calculated</div>' +
        '</div>' +

        /* Receipt table */
        '<table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e8e0cc;">' +
          '<tr>' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-size:12px;color:#3d3d5c;">' +
              'Base Tariff (First 50g)' +
              '<div style="font-size:10px;color:#888;margin-top:2px;">Rs.' + c.data.first50 + ' for first 50g</div>' +
            '</td>' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-family:monospace;font-size:14px;color:#1a1a2e;font-weight:600;text-align:right;">Rs.' + c.baseTariff + '.00</td>' +
          '</tr>' +
          addRowHtml +
          '<tr>' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-size:12px;color:#3d3d5c;">Subtotal (before GST)</td>' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-family:monospace;font-size:14px;color:#1a1a2e;font-weight:600;text-align:right;">Rs.' + c.subtotal.toFixed(2) + '</td>' +
          '</tr>' +
          '<tr style="background:rgba(26,107,60,0.05);">' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-size:12px;color:#3d3d5c;">GST @ 18%</td>' +
            '<td style="padding:10px 16px;border-bottom:1px dashed #d6cabb;font-family:monospace;font-size:14px;color:#1a6b3c;font-weight:600;text-align:right;">Rs.' + c.gst.toFixed(2) + '</td>' +
          '</tr>' +
          '<tr style="background:#1a1a2e;">' +
            '<td style="padding:13px 16px;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f5f0e8;">Total Payable</td>' +
            '<td style="padding:13px 16px;font-family:monospace;font-size:20px;font-weight:600;color:#d4a017;text-align:right;">Rs.' + c.total.toFixed(2) + '</td>' +
          '</tr>' +
        '</table>' +

        /* Calculation detail */
        '<div style="margin-top:14px;background:rgba(26,26,46,0.04);border:1px solid rgba(26,26,46,0.12);padding:12px 16px;">' +
          '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#3d3d5c;font-family:monospace;margin-bottom:8px;">Calculation Detail</div>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<tr>' +
              '<td style="padding:3px 0;font-size:11px;color:#555;font-family:monospace;">Base (first 50g)</td>' +
              '<td style="padding:3px 0;font-size:11px;color:#1a1a2e;font-family:monospace;text-align:right;font-weight:600;">Rs.' + c.baseTariff + '.00</td>' +
            '</tr>' +
            bLine2 +
            bLine3 +
          '</table>' +
        '</div>' +

        /* Footer */
        '<div style="margin-top:24px;padding-top:14px;border-top:1px solid rgba(26,26,46,0.12);display:flex;justify-content:space-between;align-items:center;">' +
          '<div style="font-size:9px;color:rgba(26,26,46,0.4);font-family:monospace;letter-spacing:0.5px;">Tariffs in INR &middot; Subject to revision &middot; ' + dateStr + ' ' + timeStr + '</div>' +
          '<div style="font-size:11px;color:rgba(26,26,46,0.35);font-family:Georgia,serif;letter-spacing:1px;">India Post</div>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

/**
 * Generate and download the PDF receipt.
 * Uses html2canvas to capture the off-screen template, then jsPDF to produce the file.
 */
async function exportPDF() {
  if (!lastCalc) return;

  const loadingEl = document.getElementById('pdfLoading');
  const tplEl     = document.getElementById('pdfTemplate');

  loadingEl.classList.add('active');
  tplEl.innerHTML = buildPdfTemplate(lastCalc);

  // Allow browser to paint the hidden element
  await new Promise(function (resolve) { setTimeout(resolve, 300); });

  try {
    const canvas = await html2canvas(tplEl.firstElementChild, {
      scale:           2.5,
      useCORS:         true,
      backgroundColor: '#f5f0e8',
      logging:         false,
      width:           560,
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;

    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const printW = 210 - margin * 2; // A4 width minus margins
    const printH = printW * (canvas.height / canvas.width);
    const yPos   = Math.max(margin, (297 - printH) / 2);

    pdf.addImage(imgData, 'PNG', margin, yPos, printW, printH);

    const safeName = lastCalc.countryVal.replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save('ITPS_Receipt_' + safeName + '_' + lastCalc.weightVal + 'g.pdf');

  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Could not generate PDF. Please try again.');
  } finally {
    loadingEl.classList.remove('active');
    tplEl.innerHTML = '';
  }
}
