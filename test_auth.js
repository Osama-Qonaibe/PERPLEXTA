const isPopupMode = true;
const targetRef = '/chat';
const allowedOrigin = 'http://localhost:3000';
const data = { token: 'abc' };

const script = `
                let isPopup = ${isPopupMode};
                try {
                  if (!isPopup) isPopup = !!(window.opener && window.opener !== window);
                } catch (e) {}
`;
console.log(script);
