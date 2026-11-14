// Temporary share handoff only. Financial records and passwords never enter this database.
(() => {
  const DB = 'finance-shared-pdf', TTL = 10 * 60 * 1000, MAX = 25 * 1024 * 1024;
  function open() {
    return new Promise((resolve, reject) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('pending', {keyPath:'id'});
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(Error('storage'));
        r.onblocked = () => reject(Error('storage'));
      } catch { reject(Error('storage')); }
    });
  }
  async function records(action) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('pending', 'readwrite'), store = tx.objectStore('pending'), request = store.getAll();
        let result;
        request.onsuccess = () => {
          const now = Date.now(), live = request.result.filter(r => r.expires > now);
          request.result.filter(r => r.expires <= now).forEach(r => store.delete(r.id));
          result = action(store, live);
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(Error('storage'));
      });
    } finally { db.close(); }
  }
  async function receive(request) {
    let destination = '/?sharedPdfError=invalid';
    try {
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;')) throw Error('invalid');
      // Bound the body before parsing multipart data, including when Content-Length is absent.
      const reader = request.body?.getReader(); if (!reader) throw Error('invalid');
      const chunks = []; let size = 0;
      try { for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > MAX + 65536) { await reader.cancel(); throw Error('large'); } chunks.push(value); } }
      finally { reader.releaseLock(); }
      const form = await new Response(new Blob(chunks), {headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();
      const values = [...form.entries()];
      if (values.length !== 1 || values[0][0] !== 'statement') throw Error('invalid');
      const file = values[0][1];
      if (!(file instanceof Blob) || !file.size || file.size > MAX) throw Error(file.size > MAX ? 'large' : 'invalid');
      if (!/\.pdf$/i.test(file.name) || !['', 'application/pdf', 'application/octet-stream'].includes(file.type.toLowerCase()) || !(await file.slice(0,1024).text()).includes('%PDF-')) throw Error('invalid');
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(-180);
      await records((store, live) => {
        // Bound abandoned shares as well as their lifetime; separate tokens keep concurrent shares apart.
        live.sort((a,b) => a.expires-b.expires).slice(0, Math.max(0, live.length-2)).forEach(r => store.delete(r.id));
        store.put({id, file:new File([file], safeName, {type:'application/pdf'}), expires:Date.now()+TTL});
      });
      destination = '/?sharedPdf=' + id;
    } catch (e) { destination = '/?sharedPdfError=' + (['large','storage'].includes(e.message) ? e.message : 'invalid'); }
    return new Response(null, {status:303, headers:{Location:destination, 'Cache-Control':'no-store'}});
  }
  self.FinanceShare = {
    receive,
    cleanup: () => records(() => undefined),
    async take(id) {
      if (!/^[\da-f-]{36}$/i.test(id)) return undefined;
      return records((store, live) => {const row = live.find(r => r.id === id); if (row) store.delete(id); return row?.file;});
    }
  };
})();
