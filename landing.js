'strict mode'

const day = new Date();
const year = day.getFullYear();
const copyrightSymbol = "\u00A9";
const footerYear = `${copyrightSymbol} ${year} ForWord. All rights reserved.`;

document.getElementById('year').textContent = footerYear;


