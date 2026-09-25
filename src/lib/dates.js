// תאריך לפי שעון ישראל, בפורמט YYYY-MM-DD. כל החידות היומיות נגזרות ממנו.
export function israelDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(d);
}

// מספר הימים מאז epoch עבור תאריך ישראלי — בסיס לבחירה דטרמיניסטית.
export function dayNumber(dateStr = israelDate()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
