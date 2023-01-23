/** Basic counter component. Hydrates from SSR'd content. */
class Counter extends HTMLElement {
    #count!: number;
    private get count() { return this.#count; }
    private set count(value) {
        this.#count = value;
        this.render();
    }

    private countEl!: HTMLSpanElement;
    private decrementBtn!: HTMLButtonElement;
    private incrementBtn!: HTMLButtonElement;

    connectedCallback(): void {
        this.countEl = this.shadowRoot!.querySelector('span')!;
        this.count = Number(this.countEl.textContent);

        this.decrementBtn = this.shadowRoot!.querySelector('#decrement')!;
        this.incrementBtn = this.shadowRoot!.querySelector('#increment')!;

        this.decrementBtn.addEventListener('click', this.decrement);
        this.incrementBtn.addEventListener('click', this.increment);
    }

    disconnectedCallback(): void {
        this.decrementBtn.removeEventListener('click', this.decrement);
        this.incrementBtn.removeEventListener('click', this.increment);
    }

    private render(): void {
        this.countEl.textContent = this.count.toString();
    }

    private readonly decrement = (() => {
        this.count--;        
    }).bind(this);

    private readonly increment = (() => {
        this.count++;
    }).bind(this);
}

customElements.define('my-counter', Counter);
