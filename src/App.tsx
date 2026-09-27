const [quitDate, setQuitDate] = useState<Date>(() => {
  try {
    const s = localStorage.getItem('clear_quitDate');
    if (s) return new Date(JSON.parse(s));
  } catch {}
  return new Date();
});
