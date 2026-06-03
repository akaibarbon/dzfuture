import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CEM G.M — متوسطة حسان بورغود" },
      { name: "description", content: "CEM G.M — منصة تلاميذ متوسطة حسان بورغود" },
      { name: "theme-color", content: "#4f46e5" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "CEM G.M" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "CEM G.M — متوسطة حسان بورغود" },
      { name: "twitter:title", content: "CEM G.M — متوسطة حسان بورغود" },
      { property: "og:description", content: "CEM G.M — منصة تلاميذ متوسطة حسان بورغود" },
      { name: "twitter:description", content: "CEM G.M — منصة تلاميذ متوسطة حسان بورغود" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/YUK8c931qbZi9AbI6ucWv1Ju9w13/social-images/social-1776526255273-8ccecb1e-d1ee-4a86-854c-5ac48383d6b8_20260408_112430_0000.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/YUK8c931qbZi9AbI6ucWv1Ju9w13/social-images/social-1776526255273-8ccecb1e-d1ee-4a86-854c-5ac48383d6b8_20260408_112430_0000.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `try{var s=localStorage.getItem('uno-dark-mode');if(!s||JSON.parse(s)?.state?.isDark!==false){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
