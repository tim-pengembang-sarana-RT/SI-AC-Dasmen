async function get() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1TyWfSfmVmLt-O9qBhycbn_2ZYgOJCQYrgLzIebQaO50/edit');
  const html = await res.text();
  const match = html.match(/\["log_mutasi_2026",(\d+)\]/i) || html.match(/\["log_mutasi.*?\",(\d+)\]/i);
  if (match) {
    const gid = match[1];
    const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/1TyWfSfmVmLt-O9qBhycbn_2ZYgOJCQYrgLzIebQaO50/export?format=csv&gid=${gid}`);
    const csv = await csvRes.text();
    console.log('CSV Headers:', csv.split('\n')[0]);
  } else {
    console.log('Sheet not found in HTML. Try looking for "log_mutasi"');
  }
}
get();
