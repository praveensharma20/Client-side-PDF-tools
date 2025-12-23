/* pdf-viewer.js
   Minimal viewer scaffolding — integrate with pdf.js or pdf-lib later. */
(function () {
  function init() {
    var el = document.getElementById('pdf-container');
    if (el) {
      el.textContent = 'PDF viewer initialized (placeholder)';
    }
    console.log('PDFViewer initialized');
  }

  window.PDFViewer = {
    init: init
  };
})();
