window.DULCE_API = (
location.hostname === 'localhost' ||
location.hostname === '127.0.0.1' ||
location.hostname.endsWith('.onrender.com')
) ? '' : 'https://caprichos-diurnos.onrender.com';