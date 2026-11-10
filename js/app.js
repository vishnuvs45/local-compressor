        // State Management
        const state = {
            files: [], // Array of { id, originalFile, compressedBlob, originalUrl, compressedUrl, name, size, compressedSize, type, format, status }
            quality: 0.8,
            scale: 1.0,
            format: 'image/webp',
            emailPreset: false,
            qualityBeforeEmailPreset: null,
            selectedId: null,
            processingRun: 0
        };

        // DOM Elements
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input');
        const qualitySlider = document.getElementById('quality-slider');
        const qualityVal = document.getElementById('quality-val');
        const scaleSlider = document.getElementById('scale-slider');
        const scaleVal = document.getElementById('scale-val');
        const formatBtns = document.querySelectorAll('.format-btn');
        const targetEmailCheckbox = document.getElementById('target-email');
        const resetSettingsBtn = document.getElementById('reset-settings');
        const appStatus = document.getElementById('app-status');
        const fileQueueTbody = document.getElementById('file-queue-tbody');
        const emptyRow = document.getElementById('empty-row');
        const downloadZipBtn = document.getElementById('download-zip-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const totalSavedText = document.getElementById('total-saved-text');
        
        // Inspector elements
        const inspectorFileName = document.getElementById('inspector-file-name');
        const comparisonEmpty = document.getElementById('comparison-empty');
        const comparisonBox = document.getElementById('comparison-box');
        const imgOriginal = document.getElementById('img-original');
        const imgCompressed = document.getElementById('img-compressed');
        const comparisonOverlay = document.getElementById('comparison-overlay');
        const comparisonSlider = document.getElementById('comparison-slider');
        const sliderHandle = document.getElementById('slider-handle');

        // Helper: Format Bytes to Readable String
        function formatBytes(bytes, decimals = 1) {
            if (!bytes || bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]);
        }

        function showStatus(message, isError = false) {
            appStatus.textContent = message;
            appStatus.classList.toggle('text-red-400', isError);
            appStatus.classList.toggle('text-gray-400', !isError);
        }

        function updateComparisonSlider(value) {
            const pct = Math.min(100, Math.max(0, Number(value) || 50));
            comparisonSlider.value = String(pct);
            comparisonOverlay.style.width = `${pct}%`;
            sliderHandle.style.left = `${pct}%`;
        }

        function resetPreview() {
            comparisonEmpty.innerHTML = `
                <i class="fa-regular fa-image text-4xl mb-2 opacity-40"></i>
                <p class="text-xs">Upload an image to compare original vs compressed live</p>
            `;
            comparisonBox.classList.add('hidden');
            comparisonEmpty.classList.remove('hidden');
            imgOriginal.removeAttribute('src');
            imgCompressed.removeAttribute('src');
            updateComparisonSlider(50);
        }

        // Initialize Event Listeners
        function init() {
            // Drag and Drop
            dropzone.addEventListener('click', (event) => {
                if (event.target !== fileInput) fileInput.click();
            });
            dropzone.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInput.click();
                }
            });
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('border-brand-500', 'bg-dark-800');
            });
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('border-brand-500', 'bg-dark-800');
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('border-brand-500', 'bg-dark-800');
                if (e.dataTransfer.files.length > 0) {
                    handleFilesAdded(Array.from(e.dataTransfer.files));
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleFilesAdded(Array.from(e.target.files));
                    fileInput.value = ''; // Reset input
                }
            });

            // Settings Controls
            qualitySlider.addEventListener('input', (e) => {
                const val = e.target.value;
                state.quality = val / 100;
                state.emailPreset = false;
                state.qualityBeforeEmailPreset = null;
                targetEmailCheckbox.checked = false;
                qualityVal.textContent = `${val}%`;
                reprocessImages();
            });

            scaleSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                state.scale = val / 100;
                scaleVal.textContent = val == 100 ? '100% (Original)' : `${val}%`;
                reprocessImages();
            });

            formatBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    formatBtns.forEach(b => {
                        b.classList.remove('active', 'bg-brand-500/20', 'text-brand-500', 'border-brand-500/40');
                        b.classList.add('bg-dark-900', 'text-gray-400', 'border-gray-700');
                    });
                    btn.classList.add('active', 'bg-brand-500/20', 'text-brand-500', 'border-brand-500/40');
                    btn.classList.remove('bg-dark-900', 'text-gray-400', 'border-gray-700');
                    state.format = btn.dataset.format;
                    reprocessImages();
                });
            });

            targetEmailCheckbox.addEventListener('change', (e) => {
                state.emailPreset = e.target.checked;
                if (state.emailPreset) {
                    state.qualityBeforeEmailPreset = state.quality;
                    state.quality = 0.5;
                    qualitySlider.value = '50';
                    qualityVal.textContent = '50%';
                } else if (state.qualityBeforeEmailPreset !== null) {
                    state.quality = state.qualityBeforeEmailPreset;
                    qualitySlider.value = String(Math.round(state.quality * 100));
                    qualityVal.textContent = `${qualitySlider.value}%`;
                    state.qualityBeforeEmailPreset = null;
                }
                reprocessImages();
            });

            resetSettingsBtn.addEventListener('click', resetSettings);

            // Comparison Slider
            comparisonSlider.addEventListener('input', (e) => {
                updateComparisonSlider(e.target.value);
            });

            // Clear & Batch Actions
            clearAllBtn.addEventListener('click', clearAllQueue);
            downloadZipBtn.addEventListener('click', downloadAllAsZip);
        }

        // Handle File Selection
        function handleFilesAdded(newFiles) {
            const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
            const rejectedCount = newFiles.length - imageFiles.length;

            if (rejectedCount > 0) {
                showStatus(`${rejectedCount} non-image file(s) skipped. Only images can be compressed.`, true);
            } else {
                showStatus('');
            }

            imageFiles.forEach(file => {
                const item = {
                    id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                    originalFile: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    compressedBlob: null,
                    compressedSize: 0,
                    originalUrl: URL.createObjectURL(file),
                    compressedUrl: null,
                    status: 'processing',
                    error: ''
                };

                state.files.push(item);
            });

            if (imageFiles.length > 0) {
                renderTable();
                processQueue();
            }
        }

        // Process Queue Batch
        async function processQueue() {
            const run = ++state.processingRun;
            const settings = {
                quality: state.quality,
                scale: state.scale,
                format: state.format
            };

            for (let item of state.files) {
                if (item.status === 'processing' || item.status === 'reprocessing') {
                    await compressSingleItem(item, run, settings);
                    if (run !== state.processingRun) return;
                }
            }
            renderTable();
            updateGlobalStats();

            if (state.selectedId) {
                selectItemForPreview(state.selectedId);
            }

            // Select first image item if none selected
            if (!state.selectedId && state.files.length > 0) {
                const firstImg = state.files.find(f => f.type.startsWith('image/'));
                if (firstImg) selectItemForPreview(firstImg.id);
            }
        }

        // Core Client-Side Image Compression Engine
        function compressSingleItem(item, run, settings) {
            return new Promise((resolve) => {
                const fail = (message) => {
                    if (run === state.processingRun) {
                        item.error = message;
                        item.status = 'error';
                    }
                    resolve();
                };
                const img = new Image();
                img.onload = () => {
                    if (run !== state.processingRun) {
                        resolve();
                        return;
                    }

                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            fail('This browser could not create an image canvas.');
                            return;
                        }

                        const targetWidth = Math.max(1, Math.round(img.width * settings.scale));
                        const targetHeight = Math.max(1, Math.round(img.height * settings.scale));

                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                        canvas.toBlob((blob) => {
                            if (run !== state.processingRun) {
                                resolve();
                                return;
                            }

                            if (!blob) {
                                fail('The browser could not encode this image.');
                                return;
                            }
                            if (blob.type !== settings.format) {
                                fail(`This browser does not support ${settings.format} output.`);
                                return;
                            }
                            if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
                            item.compressedBlob = blob;
                            item.compressedSize = blob.size;
                            item.compressedUrl = URL.createObjectURL(blob);
                            item.format = blob.type;
                            item.error = '';
                            item.status = 'done';
                            resolve();
                        }, settings.format, settings.quality);
                    } catch (error) {
                        console.error('Image compression failed:', error);
                        fail('Could not process this image.');
                    }
                };
                img.onerror = () => fail('The browser could not read this image format.');
                img.src = item.originalUrl;
            });
        }

        // Reprocess all active queue files on setting tweak
        function reprocessImages() {
            state.files.forEach(file => {
                file.status = 'reprocessing';
                file.error = '';
            });
            processQueue();
        }

        function resetSettings() {
            state.quality = 0.8;
            state.scale = 1;
            state.format = 'image/webp';
            state.emailPreset = false;
            state.qualityBeforeEmailPreset = null;
            qualitySlider.value = '80';
            qualityVal.textContent = '80%';
            scaleSlider.value = '100';
            scaleVal.textContent = '100% (Original)';
            targetEmailCheckbox.checked = false;
            formatBtns.forEach(btn => {
                const isSelected = btn.dataset.format === state.format;
                btn.classList.toggle('active', isSelected);
                btn.classList.toggle('bg-brand-500/20', isSelected);
                btn.classList.toggle('text-brand-500', isSelected);
                btn.classList.toggle('border-brand-500/40', isSelected);
                btn.classList.toggle('bg-dark-900', !isSelected);
                btn.classList.toggle('text-gray-400', !isSelected);
                btn.classList.toggle('border-gray-700', !isSelected);
            });
            reprocessImages();
        }

        // Render Table Rows
        function renderTable() {
            if (state.files.length === 0) {
                emptyRow.style.display = 'table-row';
                downloadZipBtn.disabled = true;
                clearAllBtn.classList.add('hidden');
                return;
            }

            emptyRow.style.display = 'none';
            clearAllBtn.classList.remove('hidden');
            downloadZipBtn.disabled = !state.files.some(f => f.status === 'done');

            // Synchronize existing rows or construct new ones
            state.files.forEach(item => {
                let tr = document.getElementById(item.id);
                const savedBytes = item.size - item.compressedSize;
                const savedPercent = item.size > 0 ? Math.round((savedBytes / item.size) * 100) : 0;
                const isPositiveSaved = savedBytes > 0;

                if (!tr) {
                    tr = document.createElement('tr');
                    tr.id = item.id;
                    tr.className = 'hover:bg-dark-900/40 transition-colors cursor-pointer border-b border-gray-800/60';
                    tr.addEventListener('click', (e) => {
                        if (!e.target.closest('.action-btn')) {
                            selectItemForPreview(item.id);
                        }
                    });
                    fileQueueTbody.appendChild(tr);
                }

                // Selected row highlight
                if (state.selectedId === item.id) {
                    tr.classList.add('bg-brand-500/10');
                } else {
                    tr.classList.remove('bg-brand-500/10');
                }

                tr.innerHTML = `
                    <td class="py-3 px-3">
                        <div class="flex items-center space-x-2">
                            <i class="fa-solid fa-image text-emerald-400 text-base"></i>
                            <div class="truncate max-w-[150px] sm:max-w-[200px]">
                                <p class="font-medium text-white truncate" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
                                <p class="text-[10px] text-gray-500 uppercase font-mono">${escapeHtml(item.type.split('/')[1] || 'IMAGE')}</p>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-3 font-mono text-gray-400">${formatBytes(item.size)}</td>
                    <td class="py-3 px-3 font-mono text-white font-medium">
                        ${item.status === 'done' ? formatBytes(item.compressedSize) : item.status === 'error' ? `<span class="text-red-400" title="${escapeHtml(item.error)}">Failed</span>` : '<i class="fa-solid fa-spinner animate-spin text-brand-500"></i>'}
                    </td>
                    <td class="py-3 px-3">
                        ${item.status === 'done' 
                            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${isPositiveSaved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-400'}">
                                ${isPositiveSaved ? '-' + savedPercent + '%' : '0%'}
                               </span>`
                            : item.status === 'error' ? '<span class="text-red-400" title="Compression failed">Error</span>' : '-'
                        }
                    </td>
                    <td class="py-3 px-3 text-right">
                        <div class="flex items-center justify-end space-x-2">
                            <button onclick="downloadSingleItem('${item.id}')" 
                               ${item.status !== 'done' ? 'disabled' : ''}
                               class="action-btn p-1.5 rounded-lg bg-dark-900 border border-gray-700 hover:border-brand-500 hover:text-brand-500 text-gray-300 transition-colors ${item.status !== 'done' ? 'pointer-events-none opacity-40' : ''}" 
                               title="Download Single File">
                                <i class="fa-solid fa-download"></i>
                            </button>
                            <button onclick="removeItem('${item.id}')" class="action-btn p-1.5 rounded-lg bg-dark-900 border border-gray-700 hover:border-red-500 hover:text-red-400 text-gray-400 transition-colors" title="Remove File">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                `;
            });
        }

        // Get extension from mime type
        function getExt(mime) {
            if (mime === 'image/webp') return 'webp';
            if (mime === 'image/jpeg') return 'jpg';
            if (mime === 'image/png') return 'png';
            return 'file';
        }

        // Helper to trigger clean client downloads with Data URI fallback
        function triggerDownload(blobOrUrl, fileName) {
            const objectUrl = blobOrUrl instanceof Blob
                ? URL.createObjectURL(blobOrUrl)
                : blobOrUrl;
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            if (blobOrUrl instanceof Blob) {
                window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            }
        }

        // Single file download trigger
        window.downloadSingleItem = function(id) {
            const item = state.files.find(f => f.id === id);
            if (!item || item.status !== 'done') return;

            const ext = getExt(item.format || item.type);
            const fileName = `compressed_${item.name.replace(/\.[^/.]+$/, "")}.${ext}`;
            const targetBlob = item.compressedBlob || item.originalFile;

            triggerDownload(targetBlob, fileName);
        };

        // Select item for interactive visual split inspector
        function selectItemForPreview(id) {
            state.selectedId = id;
            const item = state.files.find(f => f.id === id);

            renderTable();

            if (!item) return;

            inspectorFileName.textContent = item.name;

            if (item.type.startsWith('image/') && item.status === 'done') {
                comparisonEmpty.classList.add('hidden');
                comparisonBox.classList.remove('hidden');

                imgOriginal.src = item.originalUrl;
                imgCompressed.src = item.compressedUrl;
                updateComparisonSlider(50);
            } else {
                resetPreview();
                comparisonEmpty.innerHTML = `
                    <i class="fa-solid ${item.status === 'error' ? 'fa-circle-exclamation text-red-400' : 'fa-image text-brand-500'} text-4xl mb-2 opacity-80"></i>
                    <p class="text-xs text-white font-medium">${escapeHtml(item.name)}</p>
                    <p class="text-[11px] text-gray-400 mt-1">${item.status === 'error' ? escapeHtml(item.error) : 'Image processing in progress...'}</p>
                `;
            }
        }

        // Remove single item from queue
        window.removeItem = function(id) {
            const index = state.files.findIndex(f => f.id === id);
            if (index !== -1) {
                const item = state.files[index];
                if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
                if (item.compressedUrl && item.compressedUrl !== item.originalUrl) URL.revokeObjectURL(item.compressedUrl);
                
                const tr = document.getElementById(id);
                if (tr) tr.remove();
                
                state.files.splice(index, 1);
                state.processingRun++;
                state.files.forEach(file => {
                    if (file.status === 'processing' || file.status === 'reprocessing') {
                        file.status = 'processing';
                    }
                });
                
                if (state.selectedId === id) {
                    state.selectedId = null;
                    resetPreview();
                    inspectorFileName.textContent = 'No file selected';
                }

                renderTable();
                updateGlobalStats();
                processQueue();
            }
        };

        // Clear all files
        function clearAllQueue() {
            state.processingRun++;
            state.files.forEach(item => {
                if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
                if (item.compressedUrl && item.compressedUrl !== item.originalUrl) URL.revokeObjectURL(item.compressedUrl);
            });
            state.files = [];
            state.selectedId = null;
            fileQueueTbody.innerHTML = '';
            fileQueueTbody.appendChild(emptyRow);
            comparisonBox.classList.add('hidden');
            comparisonEmpty.classList.remove('hidden');
            inspectorFileName.textContent = 'No image selected';
            showStatus('');
            renderTable();
            updateGlobalStats();
        }

        // Update Stats Banner
        function updateGlobalStats() {
            const completed = state.files.filter(f => f.status === 'done');
            if (completed.length === 0) {
                totalSavedText.textContent = '0 files processed • 0 KB saved';
                return;
            }

            const totalOrig = completed.reduce((acc, f) => acc + f.size, 0);
            const totalComp = completed.reduce((acc, f) => acc + f.compressedSize, 0);
            const saved = Math.max(0, totalOrig - totalComp);

            totalSavedText.textContent = `${completed.length} file(s) processed • ${formatBytes(saved)} saved (${Math.round((saved / totalOrig) * 100 || 0)}%)`;
        }

        // Batch Download as ZIP using JSZip
        async function downloadAllAsZip() {
            const completed = state.files.filter(f => f.status === 'done');
            if (completed.length === 0) return;
            if (typeof JSZip === 'undefined') {
                showStatus('The ZIP library could not be loaded. Refresh the page and try again.', true);
                return;
            }

            downloadZipBtn.disabled = true;
            downloadZipBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i><span>Zipping...</span>`;

            try {
                const zip = new JSZip();
                const folder = zip.folder('compressed_files');

                for (let item of completed) {
                    const ext = getExt(item.format || item.type);
                    const fileName = `compressed_${item.name.replace(/\.[^/.]+$/, "")}.${ext}`;
                    folder.file(fileName, item.compressedBlob);
                }

                const content = await zip.generateAsync({ type: 'blob' });
                triggerDownload(content, `VaultCompress_Batch_${Date.now()}.zip`);
                showStatus('Your ZIP archive is ready to download.');
            } catch (err) {
                console.error('ZIP creation error:', err);
                showStatus('Could not create the ZIP archive. Try downloading the images individually.', true);
            } finally {
                downloadZipBtn.disabled = false;
                downloadZipBtn.innerHTML = `<i class="fa-solid fa-file-zipper"></i><span>Download All (.ZIP)</span>`;
            }
        }

        // Run Initialization
        window.onload = init;
