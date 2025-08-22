const d = new Date();
console.log('Current date (local):', d.toISOString());
console.log('Current date (local string):', d.toLocaleDateString('en-US'));

const tzDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
console.log('Dubai date (from toLocaleString):', tzDate.toISOString());
console.log('Dubai date (from toLocaleString string):', tzDate.toLocaleDateString('en-US'));

const dubaiDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
const isoDate = `${dubaiDate.getFullYear()}-${String(dubaiDate.getMonth() + 1).padStart(2, '0')}-${String(dubaiDate.getDate()).padStart(2, '0')}`;
console.log('Calculated ISO date:', isoDate);

// Test the exact function from frontend
function toISODate(d, timezone) {
  if (timezone) {
    try {
      const tzDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }))
      return `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, '0')}-${String(tzDate.getDate()).padStart(2, '0')}`
    } catch {
      // fallback below
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

console.log('Frontend toISODate function test:');
console.log('toISODate(new Date(), "Asia/Dubai"):', toISODate(new Date(), 'Asia/Dubai'));
console.log('toISODate(new Date()):', toISODate(new Date()));

