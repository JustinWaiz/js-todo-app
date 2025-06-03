// ToDo class replacing Note
class Todo {
  constructor(id, title, description, category, dueDate, completed = false) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.category = category;
    this.dueDate = dueDate;
    this.completed = completed;
  }

  static fromJSON(json) {
    return new Todo(
      json.id,
      json.title,
      json.description,
      json.category,
      json.dueDate,
      json.completed
    );
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      dueDate: this.dueDate,
      completed: this.completed,
    };
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

  reorder(newOrder) {
    this.items = newOrder;
    this._setStoredItems(this.items);
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
    this.modalElement = document.querySelector("#todo-modal");
    this.modal = new bootstrap.Modal(this.modalElement);
    this.titleInput = this.modalElement.querySelector("#todo-title");
    this.descInput = this.modalElement.querySelector("#todo-description");
    this.categoryInput = this.modalElement.querySelector("#todo-category");
    this.dueDateInput = this.modalElement.querySelector("#todo-due-date");
    this.completedInput = this.modalElement.querySelector("#todo-completed");
    this.saveBtn = this.modalElement.querySelector("#save-btn");
    this.floatingActionButton = document.querySelector(
      ".floating-action-button"
    );
    this.staticActionButton = document.querySelector(".static-action-button");

    this._initializeEventListeners();
  }

  _initializeEventListeners() {
    this.saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this._handleSave();
    });

    this.floatingActionButton?.addEventListener("click", (event) => {
      event.preventDefault();
      this.openModal();
    });

    this.staticActionButton?.addEventListener("click", (event) => {
      event.preventDefault();
      this.openModal();
    });
  }

  _handleSave() {
    const todo = {
      id: this.item.id || Date.now(),
      title: this.titleInput.value.trim(),
      description: this.descInput.value.trim(),
      category: this.categoryInput.value,
      dueDate: this.dueDateInput.value,
      completed: this.completedInput.checked,
    };

    if (!todo.title) return;

    this.item.id ? this.updateCallback(todo) : this.createCallback(todo);
    this.item = {};
    this.closeModal();
  }

  openModal() {
    this.titleInput.value = this.item.title || "";
    this.descInput.value = this.item.description || "";
    this.categoryInput.value = this.item.category || "work";
    this.dueDateInput.value = this.item.dueDate || "";
    this.completedInput.checked = this.item.completed || false;
    this.modal.show();
  }

  closeModal() {
    this.modal.hide();
  }
}

class TodoRenderService {
  renderTodos(todos, container, onEdit, onDelete) {
    container.innerHTML = "";
    todos.forEach((todo) => {
      const card = document.createElement("div");
      card.innerHTML = this._renderTodoCard(todo);
      card.firstChild.setAttribute("data-id", todo.id);
      container.appendChild(card.firstChild);
    });
    this._enableDragAndDrop(container, onEdit, onDelete);
  }

  _renderTodoCard(todo) {
    return `<div id="todo-${todo.id}" class="card category-${
      todo.category
    }" draggable="true">
      <div class="card-body">
        <div class="card-header">
          <span class="drag-handle">☰</span>
          <strong class="todo-title">${todo.title}</strong>
          <span class="todo-due-date">Due: ${todo.dueDate || "-"}</span>
        </div>
        <p class="todo-description">${todo.description || ""}</p>
      </div>
      <div class="todo-meta">
          <label><input type="checkbox" ${
            todo.completed ? "checked" : ""
          } disabled /> Done</label>
          <span class="todo-category">${todo.category}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary edit"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-secondary delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }

  _enableDragAndDrop(container, onEdit, onDelete) {
    let draggedItem = null;

    container.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedItem = card;
        setTimeout(() => (card.style.display = "none"), 0);
      });

      card.addEventListener("dragend", (e) => {
        setTimeout(() => {
          draggedItem.style.display = "block";
          draggedItem = null;
        }, 0);
      });

      card.addEventListener("dragover", (e) => e.preventDefault());

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (card !== draggedItem) {
          container.insertBefore(draggedItem, card);
          const newOrder = Array.from(container.children).map((el) => {
            return JSON.parse(localStorage.getItem("todos")).find(
              (todo) => `todo-${todo.id}` === el.id
            );
          });
          new StorageService("todos").reorder(newOrder);
        }
      });

      card
        .querySelector(".edit")
        .addEventListener("click", () =>
          onEdit(
            JSON.parse(localStorage.getItem("todos")).find(
              (t) => `todo-${t.id}` === card.id
            )
          )
        );
      card
        .querySelector(".delete")
        .addEventListener("click", () =>
          onDelete(
            JSON.parse(localStorage.getItem("todos")).find(
              (t) => `todo-${t.id}` === card.id
            )
          )
        );
    });
  }
}

(() => {
  const storage = new StorageService("todos");
  const modal = new ModalService(createTodo, updateTodo);
  const renderService = new TodoRenderService();
  let currentFilter = "all"; // default
  let currentCategory = "all";

  modal.initialize();
  renderTodos();

  function createTodo(item) {
    storage.create(item);
    renderTodos();
  }

  function updateTodo(item) {
    storage.update(item);
    renderTodos();
  }

  function onEdit(todo) {
    modal.item = todo;
    modal.openModal();
  }

  function onDelete(todo) {
    storage.delete(todo.id);
    renderTodos();
  }

  function renderTodos() {
    const container = document.querySelector("main");
    const todos = storage.get();
    const filtered = applyFilter(todos);
    renderService.renderTodos(filtered, container, onEdit, onDelete);
  }

  function applyFilter(todos) {
    let result = todos;

    if (currentFilter === "active") {
      result = result.filter((todo) => !todo.completed);
    } else if (currentFilter === "completed") {
      result = result.filter((todo) => todo.completed);
    }

    if (currentCategory !== "all") {
      result = result.filter((todo) => todo.category === currentCategory);
    }

    return result;
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderTodos();
    });
  });
  document.getElementById("category-filter").addEventListener("change", (e) => {
    currentCategory = e.target.value;
    renderTodos();
  });
  document.getElementById("state-filter").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    renderTodos();
  });
  document
    .getElementById("category-filter-2")
    .addEventListener("change", (e) => {
      currentCategory = e.target.value;
      renderTodos();
    });
})();
