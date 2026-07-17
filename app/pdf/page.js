'use client';

import { useState } from 'react';

export default function HelloPage() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setImages(prev => [...prev, ...imageUrls]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageUrls = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setImages(prev => [...prev, ...imageUrls]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Hàm lấy kích thước ảnh
  const getImageDimensions = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    });
  };

  // Hàm resize ảnh - cải thiện
  const resizeImageToWidth = (img, targetWidth) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Tính toán tỷ lệ để giữ đúng tỷ lệ khung hình
      const ratio = targetWidth / img.width;
      const targetHeight = img.height * ratio;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Vẽ ảnh với chất lượng cao
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Vẽ nền trắng
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Vẽ ảnh
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // Trả về data URL với chất lượng cao
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 1.0),
        width: targetWidth,
        height: targetHeight,
        canvas: canvas
      });
    });
  };

  // Hàm tạo PDF cải tiến
  const createPDF = async () => {
    if (images.length === 0) {
      alert('Chưa có ảnh nào để tạo PDF!');
      return;
    }

    setIsLoading(true);
    
    try {
      // Lấy kích thước của tất cả ảnh
      const imageSizes = await Promise.all(
        images.map(img => getImageDimensions(img.url))
      );
      
      // Tìm chiều rộng nhỏ nhất
      const minWidth = Math.min(...imageSizes.map(size => size.width));
      const STANDARD_WIDTH = Math.max(600, minWidth);
      
      console.log('Chuẩn hóa về chiều rộng:', STANDARD_WIDTH);
      
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      // Xử lý từng ảnh một cách tuần tự để tránh lỗi
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        console.log(`Đang xử lý ảnh ${i + 1}/${images.length}: ${image.name}`);
        
        try {
          // Load ảnh
          const img = new Image();
          img.src = image.url;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // Nếu ảnh đã load xong
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            }
            // Timeout để tránh treo
            setTimeout(() => reject(new Error('Timeout loading image')), 10000);
          });

          // Resize ảnh
          const result = await resizeImageToWidth(img, STANDARD_WIDTH);
          
          // Chuyển đổi sang buffer
          const response = await fetch(result.dataUrl);
          const imageBytes = await response.arrayBuffer();
          
          // Embed ảnh vào PDF
          let pdfImage;
          try {
            // Thử embed JPG trước
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } catch (embedError) {
            console.warn('Không thể embed JPG, thử PNG:', embedError);
            try {
              // Thử embed PNG
              pdfImage = await pdfDoc.embedPng(imageBytes);
            } catch (pngError) {
              console.warn('Không thể embed PNG, tạo lại ảnh:', pngError);
              // Tạo lại ảnh với canvas mới
              const canvas = document.createElement('canvas');
              canvas.width = result.width;
              canvas.height = result.height;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, result.width, result.height);
              
              const fallbackData = canvas.toDataURL('image/png', 1.0);
              const fallbackResponse = await fetch(fallbackData);
              const fallbackBytes = await fallbackResponse.arrayBuffer();
              pdfImage = await pdfDoc.embedPng(fallbackBytes);
            }
          }
          
          // Tạo trang với kích thước chính xác
          const page = pdfDoc.addPage([result.width, result.height]);
          page.drawImage(pdfImage, {
            x: 0,
            y: 0,
            width: result.width,
            height: result.height,
          });
          
          console.log(`Đã xử lý ảnh ${i + 1}/${images.length}`);
          
        } catch (error) {
          console.error(`Lỗi khi xử lý ảnh ${i + 1}:`, error);
          // Vẫn tiếp tục với ảnh tiếp theo
        }
      }

      // Lưu PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged-images.pdf';
      link.click();
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
    } catch (error) {
      console.error('Lỗi tạo PDF:', error);
      alert('Có lỗi xảy ra khi tạo PDF: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '36px', color: '#0070f3', textAlign: 'center' }}>
        Ghép ảnh thành PDF
      </h1>
      <p style={{ fontSize: '18px', color: '#666', textAlign: 'center', marginBottom: '30px' }}>
        Kéo thả ảnh vào để tạo file PDF - Tự động chuẩn hóa chiều rộng
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        <div>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '3px dashed #ccc',
              borderRadius: '12px',
              padding: '60px 20px',
              backgroundColor: '#f9f9f9',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onDragEnter={(e) => {
              e.currentTarget.style.borderColor = '#0070f3';
              e.currentTarget.style.backgroundColor = '#f0f7ff';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = '#ccc';
              e.currentTarget.style.backgroundColor = '#f9f9f9';
            }}
          >
            <p style={{ fontSize: '48px', margin: '10px 0' }}>+</p>
            <p style={{ fontSize: '20px', color: '#333', fontWeight: 'bold' }}>
              Kéo thả ảnh vào đây
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>hoặc</p>
            
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={() => document.getElementById('fileInput').click()}
              style={{
                padding: '12px 28px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginTop: '10px'
              }}
            >
              Chọn ảnh từ máy tính
            </button>

            {images.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#e8f5e9',
                borderRadius: '20px',
                color: '#2e7d32'
              }}>
                Đã chọn {images.length} ảnh
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={createPDF}
                disabled={isLoading}
                style={{
                  padding: '14px 40px',
                  backgroundColor: isLoading ? '#94a3b8' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '20px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  boxShadow: isLoading ? 'none' : '0 4px 6px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: isLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isLoading ? 'Đang xử lý...' : 'Tạo PDF'}
              </button>
              {isLoading && (
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  Đang xử lý {images.length} ảnh...
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#333',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '10px'
          }}>
            Danh sách ảnh ({images.length})
          </h3>
          
          {images.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              color: '#999'
            }}>
              <p style={{ fontSize: '16px' }}>Chưa có ảnh nào được chọn</p>
              <p style={{ fontSize: '14px' }}>Hãy kéo thả ảnh vào khung bên trái</p>
            </div>
          ) : (
            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              paddingRight: '10px'
            }}>
              {images.map((img, index) => (
                <div
                  key={img.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '12px',
                    marginBottom: '10px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    minWidth: '30px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#999'
                  }}>
                    #{index + 1}
                  </div>

                  <img
                    src={img.url}
                    alt={img.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}
                  />

                  <div style={{
                    flex: 1,
                    textAlign: 'left',
                    overflow: 'hidden'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#333',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {img.name}
                    </p>
                  </div>

                  <button
                    onClick={() => removeImage(img.id)}
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      width: '30px',
                      height: '30px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      opacity: isLoading ? 0.5 : 1
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length > 1 && (
                <button
                  onClick={() => setImages([])}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    marginTop: '10px',
                    width: '100%',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  Xóa tất cả ({images.length} ảnh)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
