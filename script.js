/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* --- L'Oréal Routine Builder Chatbot Additions --- */

// Store selected products in an array
let selectedProducts = [];

// Try to load selected products from localStorage on page load
if (localStorage.getItem("selectedProducts")) {
  selectedProducts = JSON.parse(localStorage.getItem("selectedProducts"));
}

// Reference to selected products section
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

// Create a modal for product descriptions
let modal = document.createElement("div");
modal.id = "productModal";
modal.style.display = "none";
modal.style.position = "fixed";
modal.style.left = "0";
modal.style.top = "0";
modal.style.width = "100vw";
modal.style.height = "100vh";
modal.style.background = "rgba(0,0,0,0.5)";
modal.style.justifyContent = "center";
modal.style.alignItems = "center";
modal.style.zIndex = "1000";
modal.innerHTML = `
  <div id="modalContent" style="background:#fff;max-width:400px;padding:30px 24px;border-radius:12px;position:relative;">
    <button id="closeModalBtn" style="position:absolute;top:10px;right:14px;font-size:22px;background:none;border:none;cursor:pointer;color:#ff003b;">&times;</button>
    <h3 id="modalProductName" style="margin-bottom:10px;"></h3>
    <p id="modalProductDesc" style="color:#444;"></p>
  </div>
`;
document.body.appendChild(modal);
document.getElementById("closeModalBtn").onclick = () =>
  (modal.style.display = "none");

/* Create HTML for displaying product cards */
function displayProducts(products) {
  window.lastDisplayedProducts = products; // For re-rendering highlights
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if selected
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
    <div class="product-card" data-id="${product.id}" style="
      border:2px solid ${isSelected ? "#e3a535" : "#ccc"};
      box-shadow:${isSelected ? "0 0 8px #e3a535" : "none"};
      position:relative;
      cursor:pointer;
      transition:border 0.2s, box-shadow 0.2s;
    ">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="desc-btn" style="
          position:absolute;top:8px;right:8px;
          background:#e3a535;color:#fff;border:none;
          border-radius:50%;width:26px;height:26px;
          font-size:15px;cursor:pointer;
        " title="Show description">i</button>
      </div>
    </div>
    `;
    })
    .join("");

  // Add click handlers for selection and info
  document.querySelectorAll(".product-card").forEach((card) => {
    const id = Number(card.getAttribute("data-id"));
    // Select/unselect on card click (not info button)
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("desc-btn")) return;
      const product = products.find((p) => p.id === id);
      const idx = selectedProducts.findIndex((p) => p.id === id);
      if (idx > -1) {
        selectedProducts.splice(idx, 1);
      } else {
        selectedProducts.push(product);
      }
      saveSelectedProducts();
      renderSelectedProducts();
      displayProducts(products);
    });
    // Info button for modal
    card.querySelector(".desc-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const product = products.find((p) => p.id === id);
      document.getElementById("modalProductName").textContent = product.name;
      document.getElementById("modalProductDesc").textContent =
        product.description;
      modal.style.display = "flex";
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  await filterAndDisplayProducts();
});

// Add "All" option to the category select if not present
if (
  categoryFilter &&
  ![...categoryFilter.options].some((opt) => opt.value === "all")
) {
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  allOption.selected = true;
  categoryFilter.insertBefore(allOption, categoryFilter.firstChild);
}

/* Helper function to call OpenAI API using fetch and async/await */
// Update to fetch from Cloudflare Worker instead of OpenAI directly
async function getOpenAIResponse(messages) {
  const workerEndpoint = "https://tommy.mahone3t.workers.dev/"; // Replace with your Cloudflare Worker URL

  // Send the messages array to the Worker, which will handle the OpenAI API call securely
  const response = await fetch(workerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messages,
    }),
  });

  const data = await response.json();
  // Check for the OpenAI response in the expected place
  if (
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    return data.choices[0].message.content;
  } else {
    return "Sorry, I couldn't get a response from the AI.";
  }
}

/* Chat form submission handler - now calls OpenAI API */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput").value;
  // Show user message in chat window
  chatWindow.innerHTML += `<div><strong>You:</strong> ${userInput}</div>`;

  // Prepare messages array for OpenAI (system + user)
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful L'Oréal beauty advisor. Answer only beauty, skincare, haircare, makeup, or fragrance questions. Be concise and friendly.",
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  // Show loading message
  chatWindow.innerHTML += `<div><em>AI is thinking...</em></div>`;

  // Call OpenAI API and display the response
  const aiResponse = await getOpenAIResponse(messages);
  chatWindow.innerHTML += `<div><strong>L'Oréal AI:</strong> ${aiResponse}</div>`;

  // Scroll chat to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Clear input
  document.getElementById("userInput").value = "";
});

/* Helper: Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Helper: Render selected products section */
function renderSelectedProducts() {
  selectedProductsList.innerHTML = "";
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div style="color:#888;">No products selected.</div>`;
    return;
  }
  selectedProducts.forEach((product, idx) => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.background = "#fff8f9";
    item.style.border = "1.5px solid #e3a535";
    item.style.borderRadius = "6px";
    item.style.padding = "6px 10px";
    item.style.marginBottom = "6px";
    item.innerHTML = `
      <span style="flex:1;font-size:15px;">${product.name}</span>
      <button aria-label="Remove" style="background:#e3a535;color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:15px;margin-left:8px;">&times;</button>
    `;
    // Remove button
    item.querySelector("button").onclick = () => {
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      renderSelectedProducts();
      // Also update product grid highlights
      if (window.lastDisplayedProducts)
        displayProducts(window.lastDisplayedProducts);
    };
    selectedProductsList.appendChild(item);
  });

  // Add "Clear All" button if there are products
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear All";
  clearBtn.style.background = "#e3a535";
  clearBtn.style.color = "#fff";
  clearBtn.style.border = "none";
  clearBtn.style.borderRadius = "6px";
  clearBtn.style.padding = "6px 16px";
  clearBtn.style.marginTop = "10px";
  clearBtn.style.cursor = "pointer";
  clearBtn.onclick = () => {
    selectedProducts = [];
    saveSelectedProducts();
    renderSelectedProducts();
    if (window.lastDisplayedProducts)
      displayProducts(window.lastDisplayedProducts);
  };
  selectedProductsList.appendChild(clearBtn);
}

/* --- Generate Routine Button Handler --- */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<div style="color:#ff003b;"><strong>Please select at least one product to generate a routine.</strong></div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }
  // Show loading spinner/message
  chatWindow.innerHTML += `<div style="color:#e3a535;"><em>Generating your personalized routine...</em></div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare messages for OpenAI
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful L'Oréal beauty advisor. Use the selected products to create a step-by-step personalized beauty routine. Be concise, friendly, and only use the provided products. If a product is not suitable for a step, skip it.",
    },
    {
      role: "user",
      content: `Here are my selected products:\n${selectedProducts
        .map((p) => `- ${p.name} (${p.brand}, ${p.category}): ${p.description}`)
        .join("\n")}\nPlease build my routine.`,
    },
  ];

  // Call OpenAI API and display the response
  const aiResponse = await getOpenAIResponse(messages);
  chatWindow.innerHTML += `<div><strong>L'Oréal AI Routine:</strong><br>${aiResponse.replace(
    /\n/g,
    "<br>"
  )}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

/* --- Product Search Bar (above grid) --- */
// Create search bar element
const searchSection = document.querySelector(".search-section");
const searchBar = document.createElement("input");
searchBar.type = "text";
searchBar.placeholder = "Search products…";
searchBar.style.marginRight = "12px";
searchBar.style.flex = "2";
searchBar.style.padding = "16px";
searchBar.style.fontSize = "18px";
searchBar.style.border = "2px solid #e3a535";
searchBar.style.borderRadius = "8px";
searchBar.style.outline = "none";
searchSection.insertBefore(searchBar, searchSection.firstChild);

// Filter products by search and category
let allProductsCache = [];
async function filterAndDisplayProducts() {
  const products = await loadProducts();
  allProductsCache = products;
  const selectedCategory = categoryFilter.value;
  const searchTerm = searchBar.value.trim().toLowerCase();
  let filtered = products;
  // If "All" is selected or nothing is selected, show all products
  if (selectedCategory && selectedCategory !== "all") {
    filtered = filtered.filter((p) => p.category === selectedCategory);
  }
  if (searchTerm) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }
  displayProducts(filtered);
}
searchBar.addEventListener("input", filterAndDisplayProducts);
categoryFilter.addEventListener("change", filterAndDisplayProducts);

// On page load, show all products if nothing selected
window.addEventListener("DOMContentLoaded", () => {
  // Always render selected products on load
  renderSelectedProducts();
  filterAndDisplayProducts();
});

/* --- RTL Language Support Toggle --- */
// Add RTL toggle button to header
// const siteHeader = document.querySelector(".site-header");
// const rtlBtn = document.createElement("button");
// rtlBtn.textContent = "RTL";
// rtlBtn.style.background = "#e3a535";
// rtlBtn.style.color = "#fff";
// rtlBtn.style.border = "none";
// rtlBtn.style.borderRadius = "6px";
// rtlBtn.style.padding = "6px 16px";
// rtlBtn.style.marginLeft = "18px";
// rtlBtn.style.cursor = "pointer";
// rtlBtn.title = "Toggle right-to-left mode";
// siteHeader.appendChild(rtlBtn);

// rtlBtn.onclick = () => {
//   if (document.body.dir === "rtl") {
//     document.body.dir = "ltr";
//   } else {
//     document.body.dir = "rtl";
//   }
// };

// --- End of L'Oréal Routine Builder Chatbot Additions ---
//     document.body.dir = "ltr";
//   } else {
//     document.body.dir = "rtl";
//   }
// };

// --- End of L'Oréal Routine Builder Chatbot Additions ---
// };

// --- End of L'Oréal Routine Builder Chatbot Additions ---
