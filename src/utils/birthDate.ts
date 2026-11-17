// 생년월일 입력 도우미 (기획 결정 11/16: 가입 때 생년월일로 만 19세 확인, 본인 입력)
// 숫자만 받아서 'YYYY-MM-DD' 로 자동 정리

export function formatBirthInput(text: string) {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// 비어 있으면 undefined, 틀리면 안내 문구
export function birthDateError(value: string): string | undefined {
  if (value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '생년월일 8자리를 입력해주세요. (예: 20010519)';
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!valid || y < 1900 || date.getTime() > Date.now()) return '올바른 날짜가 아니에요.';
  return undefined;
}
