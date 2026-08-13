const url = 'https://script.google.com/macros/s/AKfycbyCBFMS4tDhkQmzVhm6pL5Uime8L5SGeBz8aykiy0ziBkS4473gTlgufQl4MJK2q5_0/exec?action=sync_tuya&deviceIds=bf0fc3897a43d32f4c89u6&id=1jK1W8k9-vYvDXYh4L36wN4Wd0C885B4rI2L_03b_7pY';

fetch(url)
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(text => console.log("Body:", text.substring(0, 500)))
  .catch(err => console.error("Error:", err));
