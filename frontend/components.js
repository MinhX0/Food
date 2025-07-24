// Render header component
function renderHeader() {
    return `
    <nav class="bg-gray-950 text-gray-100 p-4 shadow-md border-b border-gray-800">
        <div class="container mx-auto flex justify-between items-center">
            <div class="flex items-center space-x-2">
                <a href="index.html">
                    <img src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/e8aad51a-599e-4a12-b08e-c55418a5118b.png"
                        alt="CIIS Logo" class="h-10" />
                </a>
                <h1 class="text-xl font-bold text-green-400">CIIS</h1>
            </div>
            <div class="space-x-6 hidden md:flex">
                <a href="index.html" class="hover:text-green-400">Dashboard</a>
                <a href="requeststocks.html" id="investSuggestBtn" class="hover:text-green-400">Gợi ý đầu tư</a>
                <a href="about.html" id="aboutUsBtn" class="hover:text-green-400">About us</a>
            </div>
        </div>
    </nav>`;
}

// Render footer component
function renderFooter() {
    return `
    <footer class="bg-gray-950 text-gray-300 py-8 px-4 border-t border-gray-800">
        <div class="container mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h3 class="text-xl font-bold mb-4 text-green-400">CIIS</h3>
                    <p class="text-gray-400">Hệ thống phân tích thị trường</p>
                </div>
                <div>
                    <h3 class="text-xl font-bold mb-4 text-green-400">Liên hệ</h3>
                    <ul class="text-gray-400 space-y-2">
                        <li><i class="fas fa-envelope mr-2"></i> contact@ciis.vn</li>
                        <li><i class="fas fa-phone mr-2"></i> 0123 456 789</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-xl font-bold mb-4 text-green-400">Thông tin</h3>
                    <ul class="text-gray-400 space-y-2">
                        <li><a href="#" class="hover:text-green-400">Điều khoản</a></li>
                        <li><a href="#" class="hover:text-green-400">Bảo mật</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500">
                <p>© 2025 CIIS. All rights reserved.</p>
            </div>
        </div>
    </footer>`;
}

// Render loading spinner component
function renderLoadingSpinner() {
    return `
    <div id="loadingSpinner"
        style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:rgba(20,20,20,0.85);"
        class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500 border-b-4 border-gray-700"></div>
    </div>`;
}

// Initialize components
function initComponents() {
    // Find placeholder elements and replace with components
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');
    const spinnerPlaceholder = document.getElementById('spinner-placeholder');

    if (headerPlaceholder) headerPlaceholder.innerHTML = renderHeader();
    if (footerPlaceholder) footerPlaceholder.innerHTML = renderFooter();
    if (spinnerPlaceholder) spinnerPlaceholder.innerHTML = renderLoadingSpinner();

    // Initialize chatbot
    if (window.initializeChatbot) {
        window.initializeChatbot();
    }
}
