export const REGIONS = {
  AU: { name: 'Australia', currency: 'AUD', locale: 'en-AU', supportName: 'Quitline', phone: '13 7848', tel: '137848', url: 'https://www.quit.org.au/' },
  US: { name: 'United States', currency: 'USD', locale: 'en-US', supportName: 'Quitline', phone: '1-800-QUIT-NOW', tel: '18007848669', url: 'https://smokefree.gov/tools-tips/get-extra-help/speak-to-an-expert' },
  SE: { name: 'Sweden', currency: 'SEK', locale: 'en-SE', supportName: 'Sluta-röka-linjen', phone: '020-84 00 00', tel: '020840000', url: 'https://www.slutarokalinjen.se/other-languages/engelska' },
  OTHER: { name: 'Other / choose currency', currency: 'USD', locale: 'en', supportName: 'Local quit-smoking support', phone: '', tel: '', url: 'https://www.who.int/health-topics/tobacco' },
};
export const CURRENCIES = ['AUD', 'USD', 'SEK', 'GBP', 'EUR', 'CAD', 'NZD'];
export const validRegion = value => Object.hasOwn(REGIONS, value) ? value : 'AU';
export const validCurrency = (value, region = 'AU') => CURRENCIES.includes(value) ? value : REGIONS[validRegion(region)].currency;
export const formatMoney = (amount, currency = 'AUD', region = 'AU', digits = 2) => new Intl.NumberFormat(REGIONS[validRegion(region)].locale, {
  style: 'currency', currency: validCurrency(currency, region), currencyDisplay: 'code', minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(Number.isFinite(amount) ? amount : 0);
