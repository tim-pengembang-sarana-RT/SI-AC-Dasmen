const url = 'https://script.google.com/macros/s/AKfycbyCBFMS4tDhkQmzVhm6pL5Uime8L5SGeBz8aykiy0ziBkS4473gTlgufQl4MJK2q5_0/exec?action=test';

fetch(url)
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(text => console.log("Body:", text.substring(0, 200)))
  .catch(err => console.error("Error:", err));
