const padDatePart = (value: number) => String(value).padStart(2, '0');

export const createDefaultAuthFileName = (date = new Date()) =>
  `${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}-${padDatePart(
    date.getHours()
  )}-${padDatePart(date.getMinutes())}-codex-account.json`;
