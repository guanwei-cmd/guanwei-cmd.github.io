(function () {
  "use strict";

  if (!window.Intl || !Intl.Segmenter) return;

  var segmenter;
  try {
    segmenter = new Intl.Segmenter("zh-Hant", { granularity: "word" });
  } catch (_) {
    return;
  }

  var HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
  var ZERO_WIDTH_BREAK = "\u200b";
  var SKIP = "script,style,code,pre,input,textarea,select,option,[contenteditable],[data-no-segment],.nb,.no-break";

  function segmentText(node) {
    var value = node.nodeValue;
    if (!value || value.length < 4 || value.indexOf(ZERO_WIDTH_BREAK) !== -1 || !HAN.test(value)) return;
    if (node.parentElement && node.parentElement.closest(SKIP)) return;

    var output = "";
    var previous = "";
    var parts = segmenter.segment(value);
    for (var part of parts) {
      if (previous && HAN.test(previous.charAt(previous.length - 1)) && HAN.test(part.segment.charAt(0))) {
        output += ZERO_WIDTH_BREAK;
      }
      output += part.segment;
      previous = part.segment;
    }
    if (output !== value) node.nodeValue = output;
  }

  function segmentTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      segmentText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(SKIP)) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(segmentText);
  }

  function start() {
    segmentTree(document.body);
    document.documentElement.classList.add("zh-word-break");

    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(segmentTree);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
