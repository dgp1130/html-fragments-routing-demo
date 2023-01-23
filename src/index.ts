(async () => {
    await navigator.serviceWorker.register('/service-worker.js');

    const header = document.querySelector('h2')!;
    header.textContent = 'Service worker installed! Reloading the page...';

    await new Promise<void>((resolve) => {
        setTimeout(() => void resolve(), 1_000);
    });

    location.reload();
})();
