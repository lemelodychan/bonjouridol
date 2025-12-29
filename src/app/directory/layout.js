import Script from 'next/script';

export default function DirectoryLayout({ children }) {
  return (
    <>
      {/* Inline blocking script - runs before React hydrates */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var saved = localStorage.getItem('directory-view-mode');
                var viewMode = (saved === 'card' || saved === 'row') ? saved : 'card';
                window.__DIRECTORY_VIEW_MODE__ = viewMode;
                
                // Inject styles to hide the wrong skeleton and set button states before render
                var style = document.createElement('style');
                style.id = 'directory-view-mode-styles';
                var css = '';
                if (viewMode === 'row') {
                  css = '[data-view="card"] { display: none !important; } [data-view-button="row"] { background-color: var(--bi-dark-pink) !important; color: white !important; }';
                } else {
                  css = '[data-view="row"] { display: none !important; } [data-view-button="card"] { background-color: var(--bi-dark-pink) !important; color: white !important; }';
                }
                style.textContent = css;
                document.head.appendChild(style);
              } catch(e) {
                window.__DIRECTORY_VIEW_MODE__ = 'card';
                var style = document.createElement('style');
                style.id = 'directory-view-mode-styles';
                style.textContent = '[data-view="row"] { display: none !important; } [data-view-button="card"] { background-color: var(--bi-dark-pink) !important; color: white !important; }';
                document.head.appendChild(style);
              }
            })();
          `,
        }}
      />
      {children}
    </>
  );
}

