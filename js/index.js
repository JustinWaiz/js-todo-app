class Note {
  constructor(id, text) {
    this.id = id;
    this.text = text;
  }

  static fromJSON(json) {
    return new Note(json.id, json.text);
  }

  toJSON() {
    return { id: this.id, text: this.text };
  }
}

class StorageService {
  constructor(key) {
    this.key = key;
    this.items = this._getStoredItems();
  }

  _setStoredItems(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  _getStoredItems() {
    return JSON.parse(localStorage.getItem(this.key)) || [];
  }

  create(item) {
    const newItem = { id: Date.now(), ...item };
    this.items.push(newItem);
    this._setStoredItems(this.items);
    return newItem;
  }

  get() {
    return this.items;
  }

  update(updatedItem) {
    const index = this.items.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      Object.assign(this.items[index], updatedItem);
      this._setStoredItems(this.items);
      return { ...updatedItem };
    }
    console.warn("Item does not exist");
    return null;
  }

  delete(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [deletedItem] = this.items.splice(index, 1);
      this._setStoredItems(this.items);
      return deletedItem;
    }
    console.warn("Item does not exist");
    return null;
  }

  deleteAll() {
    this.items = [];
    localStorage.removeItem(this.key);
    console.info(`All items deleted from ${this.key}`);
  }
}

class ModalService {
  constructor(createCallback, updateCallback) {
    this.createCallback = createCallback;
    this.updateCallback = updateCallback;
    this.item = {};
  }

  initialize() {
    this.modalElement = document.querySelector(".modal");
    this.modal = new bootstrap.Modal(this.modalElement);
    this.textarea = this.modalElement.querySelector("textarea");
    this.saveBtn = this.modalElement.querySelector(".btn-primary");
    this.floatingActionButton = document.querySelector(
      ".floating-action-button"
    );
    this.staticActionButton = document.querySelector(".static-action-button");

    this._initializeEventListeners();
  }

  _initializeEventListeners() {
    this.modalElement.addEventListener("shown.bs.modal", () =>
      this.textarea.focus()
    );
    this.saveBtn.addEventListener("click", () => this._handleSave());
    this.floatingActionButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.openModal();
    });
    this.staticActionButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.openModal();
    });
  }

  async _handleSave() {
    const text = this.textarea.value.trim();
    if (!text) return;

    this.item.text = text;
    this.item.id
      ? await this.updateCallback(this.item)
      : await this.createCallback(this.item);
    this.item = {};
    this.closeModal();
  }

  openModal() {
    this.textarea.value = this.item.text || "";
    this.modal.show();
  }

  closeModal() {
    this.modal.hide();
  }
}

class NotesRenderService {
  renderNotes(notes, container, onEdit, onDelete) {
    container.innerHTML = "";
    notes.forEach((note) => {
      const card = document.createElement("div");
      card.innerHTML = this._renderNoteCard(note);
      container.appendChild(card);
      this._attachNoteButtonEvents(note, onEdit, onDelete);
    });
  }

  _renderNoteCard(note) {
    return `<div id="note-${note.id}" class="card">
          <div class="card-body">
            <div class="card-text">${note.text}</div>
          </div>
          <div class="card-actions" id="card-actions-${note.id}">
            <button class="btn btn-primary"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-secondary"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
  }

  _attachNoteButtonEvents(note, onEdit, onDelete) {
    const cardActions = document.getElementById(`card-actions-${note.id}`);
    if (!cardActions) return;

    cardActions
      .querySelector(".btn-primary")
      .addEventListener("click", (event) => {
        event.preventDefault();
        onEdit(note);
      });

    cardActions
      .querySelector(".btn-secondary")
      .addEventListener("click", (event) => {
        event.preventDefault();
        onDelete(note);
      });
  }
}

// Initialization
const initialize = () => {
  const storageService = new StorageService("note");
  const modalService = new ModalService(createCallback, updateCallback);
  modalService.initialize();

  function renderNotes() {
    const container = document.querySelector("main");
    const notesRenderService = new NotesRenderService();
    notesRenderService.renderNotes(
      storageService.get().sort((a, b) => b.id - a.id),
      container,
      onEdit,
      onDelete
    );
  }

  function createCallback(note) {
    storageService.create(note);
    renderNotes();
  }

  function updateCallback(note) {
    storageService.update(note);
    renderNotes();
  }

  function onEdit(item) {
    modalService.item = item;
    modalService.openModal();
  }

  function onDelete(item) {
    storageService.delete(item.id);
    renderNotes();
  }

  renderNotes();
};

initialize();

class HttpService {
  constructor(
    apiBaseUrl,
    defaultHeaders = { "Content-Type": "application/json" }
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.defaultHeaders = defaultHeaders;
  }

  async request(endpoint, method = "GET", body = null, headers = {}) {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : null,
    });

    return this.handleResponse(response);
  }

  async get(endpoint) {
    return this.request(endpoint, "GET");
  }

  async getById(endpoint, id) {
    return this.get(`${endpoint}/${id}`);
  }

  async post(endpoint, data) {
    return this.request(endpoint, "POST", data);
  }

  async put(endpoint, id, data) {
    return this.request(`${endpoint}/${id}`, "PUT", data);
  }

  async delete(endpoint, id) {
    return this.request(`${endpoint}/${id}`, "DELETE");
  }

  async handleResponse(response) {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  }
}

const testHttp = () => {
  const api = new HttpService("https://jsonplaceholder.typicode.com");

  // Get all data
  api
    .get("/posts")
    .then((data) => console.log("GET all:", data))
    .catch((error) => console.error("GET Error:", error));

  // Get single item by ID (/data/1)
  api
    .getById("/posts", 1)
    .then((data) => console.log("GET by ID:", data))
    .catch((error) => console.error("GET by ID Error:", error));

  // Update item (/data/1)
  api
    .put("/posts", 1, { name: "Updated Name" })
    .then((data) => console.log("PUT Success:", data))
    .catch((error) => console.error("PUT Error:", error));

  // Delete item (/data/1)
  api
    .delete("/posts", 1)
    .then(() => console.log("DELETE Success"))
    .catch((error) => console.error("DELETE Error:", error));
};

testHttp();
