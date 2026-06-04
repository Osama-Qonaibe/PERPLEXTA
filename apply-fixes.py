#!/usr/bin/env python3
import re, sys
errors = []

print("Fixing AppContext.tsx...")
with open('src/context/AppContext.tsx', 'r') as f:
    c = f.read()

old = "      const isSamePage = currentPath === targetRef || \n                         (currentPath === '/' && targetRef === '/chat') || \n                         (currentPath === '/chat' && targetRef === '/');"""
new = "      const isSamePage = currentPath === targetRef;"
if old in c: c = c.replace(old, new, 1); print("  [OK] isSamePage simplified")
else: errors.append("isSamePage not found")

old = """        if (isSamePage) {
          profileFetched.current = false;
          fetchUserProfile();
          fetchBalance();"""
new = """        if (isSamePage) {
          // setUser + setToken already trigger fetchUserProfile via token useEffect
          fetchBalance();"""
if old in c: c = c.replace(old, new, 1); print("  [OK] duplicate fetchUserProfile removed")
else: errors.append("duplicate fetchUserProfile not found")

old = """          localStorage.setItem('app_logged_in_toast', '1');
          localStorage.setItem('app_loader_type', 'login');
          localStorage.setItem('app_force_refresh', '1');
          window.location.href = targetRef;"""
new = """          localStorage.setItem('app_logged_in_toast', '1');
          localStorage.setItem('app_loader_type', 'login');
          window.dispatchEvent(new CustomEvent('app_navigate', { detail: targetRef }));"""
if old in c: c = c.replace(old, new, 1); print("  [OK] SPA navigation")
else: errors.append("window.location.href block not found")

old = """    const messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {"""
new = """    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {"""
if old in c: c = c.replace(old, new, 1); print("  [OK] event.origin check")
else: errors.append("messageListener not found")

old = """      window.open(data.url, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);

    } catch (error) {
      console.error('Login failed', error);
    }
  };"""
new = """      const popup = window.open(data.url, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);
      if (popup) {
        const pollTimer = setInterval(() => {
          try { if (popup.closed) { clearInterval(pollTimer); } }
          catch (e) { clearInterval(pollTimer); }
        }, 500);
      }

    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };"""
if old in c: c = c.replace(old, new, 1); print("  [OK] popup + throw error")
else: errors.append("popup/catch block not found")

with open('src/context/AppContext.tsx', 'w') as f:
    f.write(c)

print("Fixing AuthModal.tsx...")
with open('src/components/AuthModal.tsx', 'r') as f:
    c = f.read()

old = '              onClick={loginWithGoogle}\n              type="button"'
new = '              onClick={async () => {\n                setError(null);\n                setIsLoading(true);\n                try {\n                  await loginWithGoogle();\n                } catch (err) {\n                  setError(dir === \'rtl\' ? \'فشل تسجيل الدخول عبر Google\' : \'Google login failed\');\n                } finally {\n                  setIsLoading(false);\n                }\n              }}\n              disabled={isLoading}\n              type="button"'
if old in c: c = c.replace(old, new, 1); print("  [OK] Google button state")
else: errors.append("AuthModal Google onClick not found")

with open('src/components/AuthModal.tsx', 'w') as f:
    f.write(c)

print("Fixing ChatPage.tsx...")
with open('src/pages/ChatPage.tsx', 'r') as f:
    c = f.read()

old = "  }, [routeChatId, token, isAuthReady]);"
new = "  }, [routeChatId, isAuthReady]);"
if old in c: c = c.replace(old, new, 1); print("  [OK] removed token from deps")
else: errors.append("loadChat deps not found")

old = """    window.addEventListener('clear-chat', handleClearChat);
    window.addEventListener('load-chat', handleLoadChat);
    return () => {
      window.removeEventListener('clear-chat', handleClearChat);
      window.removeEventListener('load-chat', handleLoadChat);
    };"""
new = """    const handleAppNavigate = (e: any) => { navigate(e.detail, { replace: true }); };
    window.addEventListener('clear-chat', handleClearChat);
    window.addEventListener('load-chat', handleLoadChat);
    window.addEventListener('app_navigate', handleAppNavigate);
    return () => {
      window.removeEventListener('clear-chat', handleClearChat);
      window.removeEventListener('load-chat', handleLoadChat);
      window.removeEventListener('app_navigate', handleAppNavigate);
    };"""
if old in c: c = c.replace(old, new, 1); print("  [OK] app_navigate listener")
else: errors.append("clear-chat block not found")

with open('src/pages/ChatPage.tsx', 'w') as f:
    f.write(c)

if errors:
    print(f"\n⚠️  {len(errors)} warning(s):")
    for e in errors: print(f"   - {e}")
else:
    print("\n✅ All fixes applied!")
print("Next: npm run build")
