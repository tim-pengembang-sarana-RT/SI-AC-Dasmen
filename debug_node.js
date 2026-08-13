const url = 'https://script.google.com/macros/s/AKfycbyAkEX2mgONV1E9aPX1ti5DUoIEWPnCMjUG0RS2VOeoybqm20B8WiLmASZHHJY2ga2W/exec?id=11R2z5n1rLg3X4dI72F31h_K8H808_K7tQ_Yk8N9N0E';

fetch(url)
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(text => console.log("Body:", text.substring(0, 500)))
  .catch(err => console.error("Error:", err));
