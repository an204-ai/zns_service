import { useState } from 'react';
import {
  CopySimple,
  Check,
  Key,
  PaperPlaneTilt,
  MagnifyingGlass,
  ListChecks,
  WebhooksLogo,
  ShieldCheck,
  Table,
} from '@phosphor-icons/react';

export default function CustomerApiDocs() {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendCurlExample = `curl -X POST "https://your-domain.com/api/v1/zns/send" \\
  -H "x-api-key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "0987654321",
    "template_id": "281942",
    "template_data": {
      "customer_name": "Nguyen Van A",
      "order_code": "DH20260925",
      "amount": "500000"
    },
    "ref_id": "ORDER_12345"
  }'`;

  const sendResponseExample = `{
  "success": true,
  "data": {
    "tracking_id": "cm7a1b2c3d4e5f6g7h8i9j0k",
    "status": "QUEUED"
  }
}`;

  const statusCurlExample = `curl -X GET "https://your-domain.com/api/v1/zns/status/cm7a1b2c3d4e5f6g7h8i9j0k" \\
  -H "x-api-key: your_api_key_here"`;

  const statusResponseExample = `{
  "success": true,
  "data": {
    "tracking_id": "cm7a1b2c3d4e5f6g7h8i9j0k",
    "phone": "0987654321",
    "template_id": "281942",
    "status": "DELIVERED",
    "message_id": "msg_987654321",
    "error_code": null,
    "error_message": null,
    "sent_at": "2026-09-25T08:00:00.000Z",
    "delivered_at": "2026-09-25T08:00:03.000Z"
  }
}`;

  const templatesCurlExample = `curl -X GET "https://your-domain.com/api/v1/zns/templates" \\
  -H "x-api-key: your_api_key_here"`;

  const templatesResponseExample = `{
  "success": true,
  "data": [
    {
      "template_id": "281942",
      "name": "Xác nhận đơn hàng thành công",
      "tag": "GIAO_DICH",
      "params": [
        { "name": "customer_name", "require": true, "type": "STRING" },
        { "name": "order_code", "require": true, "type": "STRING" },
        { "name": "amount", "require": true, "type": "STRING" }
      ],
      "status": "ENABLE",
      "app_name": "OA Doanh nghiệp"
    }
  ]
}`;

  const webhookPayloadExample = `{
  "event": "zns.dlr_status",
  "tracking_id": "cm7a1b2c3d4e5f6g7h8i9j0k",
  "ref_id": "ORDER_12345",
  "phone": "0987654321",
  "status": "DELIVERED",
  "message_id": "msg_987654321",
  "error_code": null,
  "error_info": null,
  "sent_time": "2026-09-25 08:00:00",
  "delivered_at": "2026-09-25T08:00:03.000Z"
}`;

  const webhookResponseExample = `{
  "success": true
}`;

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 className="page-header-title">Tài liệu API</h1>
        <p className="page-header-desc">
          Tài liệu tích hợp cổng gửi tin nhắn ZNS và nhận báo cáo trạng thái tự động
        </p>
      </div>

      {/* Phần: Xác thực API */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={16} weight="bold" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            Thông tin xác thực API
          </span>
        </div>
        <div className="card-body" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 2 }}>Header xác thực</div>
              <code style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>x-api-key: &lt;khóa_api_key&gt;</code>
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 2 }}>Định dạng dữ liệu</div>
              <code style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>Content-Type: application/json</code>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
            Mỗi ứng dụng liên kết được cấp một khóa API Key riêng biệt trong mục <strong>Thông tin ứng dụng</strong>. Truyền khóa này trong Header <code>x-api-key</code> tại tất cả các yêu cầu gửi đến hệ thống.
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. API GỬI TIN NHẮN ZNS */}
      {/* ======================================================== */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PaperPlaneTilt size={16} weight="bold" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              1. API Gửi tin nhắn ZNS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: '#16a34a', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>
              POST
            </span>
            <code style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 600, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4 }}>
              /api/v1/zns/send
            </code>
          </div>
        </div>

        <div className="card-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bảng tham số Body */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              Tham số Request Body
            </div>
            <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '22%' }}>Tham số</th>
                    <th style={{ width: '14%' }}>Kiểu dữ liệu</th>
                    <th style={{ width: '16%' }}>Bắt buộc</th>
                    <th style={{ width: '48%' }}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>phone</code></td>
                    <td>string</td>
                    <td><span className="badge badge-danger">Bắt buộc</span></td>
                    <td>Số điện thoại nhận tin định dạng 84xxx hoặc 0xxx</td>
                  </tr>
                  <tr>
                    <td><code>template_id</code></td>
                    <td>string / number</td>
                    <td><span className="badge badge-danger">Bắt buộc</span></td>
                    <td>Mã Template ID đã được nhà mạng và Zalo phê duyệt</td>
                  </tr>
                  <tr>
                    <td><code>template_data</code></td>
                    <td>object</td>
                    <td><span className="badge badge-danger">Bắt buộc</span></td>
                    <td>Cặp giá trị tham số tương ứng với mẫu tin đã đăng ký</td>
                  </tr>
                  <tr>
                    <td><code>ref_id</code></td>
                    <td>string</td>
                    <td><span className="badge badge-neutral">Tùy chọn</span></td>
                    <td>Mã tham chiếu đơn hàng hoặc giao dịch từ hệ thống khách hàng</td>
                  </tr>
                  <tr>
                    <td><code>callback_url</code></td>
                    <td>string</td>
                    <td><span className="badge badge-neutral">Tùy chọn</span></td>
                    <td>URL Webhook nhận kết quả gửi tin riêng cho yêu cầu này</td>
                  </tr>
                  <tr>
                    <td><code>callback_secret</code></td>
                    <td>string</td>
                    <td><span className="badge badge-neutral">Tùy chọn</span></td>
                    <td>Mã Bearer Token xác thực gửi kèm khi gọi Webhook</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ví dụ Request */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu yêu cầu cURL</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('curl-send', sendCurlExample)}
              >
                {copiedId === 'curl-send' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'curl-send' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {sendCurlExample}
            </pre>
          </div>

          {/* Ví dụ Response */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu phản hồi thành công</span>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                  202 Accepted
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('res-send', sendResponseExample)}
              >
                {copiedId === 'res-send' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'res-send' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {sendResponseExample}
            </pre>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. API TRA CỨU TRẠNG THÁI TIN NHẮN */}
      {/* ======================================================== */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MagnifyingGlass size={16} weight="bold" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              2. API Tra cứu trạng thái tin nhắn
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: '#2563eb', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>
              GET
            </span>
            <code style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 600, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4 }}>
              /api/v1/zns/status/:trackingId
            </code>
          </div>
        </div>

        <div className="card-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tham số URL */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              Tham số Path Parameter
            </div>
            <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '22%' }}>Tham số</th>
                    <th style={{ width: '14%' }}>Kiểu dữ liệu</th>
                    <th style={{ width: '16%' }}>Bắt buộc</th>
                    <th style={{ width: '48%' }}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>trackingId</code></td>
                    <td>string</td>
                    <td><span className="badge badge-danger">Bắt buộc</span></td>
                    <td>Mã tracking ID nhận được từ phản hồi của API gửi tin</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ví dụ Request cURL */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu yêu cầu cURL</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('curl-status', statusCurlExample)}
              >
                {copiedId === 'curl-status' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'curl-status' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {statusCurlExample}
            </pre>
          </div>

          {/* Ví dụ Response */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu phản hồi thành công</span>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                  200 OK
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('res-status', statusResponseExample)}
              >
                {copiedId === 'res-status' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'res-status' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {statusResponseExample}
            </pre>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. API LẤY DANH SÁCH MẪU TIN ZNS */}
      {/* ======================================================== */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListChecks size={16} weight="bold" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              3. API Lấy danh sách mẫu tin ZNS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: '#2563eb', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>
              GET
            </span>
            <code style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 600, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4 }}>
              /api/v1/zns/templates
            </code>
          </div>
        </div>

        <div className="card-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12.5, color: '#475569' }}>
            Lấy toàn bộ danh sách các mẫu tin ZNS khả dụng cùng danh sách tham số động tương ứng với ứng dụng liên kết của API Key.
          </div>

          {/* Ví dụ Request cURL */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu yêu cầu cURL</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('curl-templates', templatesCurlExample)}
              >
                {copiedId === 'curl-templates' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'curl-templates' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {templatesCurlExample}
            </pre>
          </div>

          {/* Ví dụ Response */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Mẫu phản hồi thành công</span>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                  200 OK
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('res-templates', templatesResponseExample)}
              >
                {copiedId === 'res-templates' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'res-templates' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {templatesResponseExample}
            </pre>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. WEBHOOK BÁO CÁO KẾT QUẢ GỬI TIN DLR */}
      {/* ======================================================== */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WebhooksLogo size={16} weight="bold" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              4. Webhook Báo cáo kết quả gửi tin DLR
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: '#d97706', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>
              CALLBACK POST
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Đẩy về máy chủ của bạn
            </span>
          </div>
        </div>

        <div className="card-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
            Khi nhà mạng và Zalo phản hồi kết quả phát tin, máy chủ Zalo Services sẽ tự động gửi một HTTP POST chứa trạng thái tin nhắn về Webhook URL đã được cài đặt trong cấu hình ứng dụng hoặc qua tham số <code>callback_url</code> khi gọi API gửi tin.
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Header gửi kèm đến máy chủ khách hàng:</div>
            <div style={{ fontFamily: 'monospace', color: '#334155' }}>Content-Type: application/json</div>
            <div style={{ fontFamily: 'monospace', color: '#334155' }}>Authorization: Bearer &lt;chuỗi_token_bí_mật&gt; (nếu đã thiết lập mã xác thực)</div>
          </div>

          {/* Dữ liệu Webhook gửi về */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Dữ liệu JSON máy chủ của bạn nhận được</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('payload-webhook', webhookPayloadExample)}
              >
                {copiedId === 'payload-webhook' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'payload-webhook' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {webhookPayloadExample}
            </pre>
          </div>

          {/* Phản hồi yêu cầu */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Phản hồi yêu cầu từ máy chủ của bạn</span>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                  200 OK
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleCopy('res-webhook', webhookResponseExample)}
              >
                {copiedId === 'res-webhook' ? <Check size={12} color="#16a34a" /> : <CopySimple size={12} />}
                <span>{copiedId === 'res-webhook' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {webhookResponseExample}
            </pre>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. BẢNG TRA CỨU TRẠNG THÁI TIN NHẮN */}
      {/* ======================================================== */}
      <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
        <div
          className="card-header"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Table size={16} weight="bold" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            5. Bảng tra cứu trạng thái tin nhắn
          </span>
        </div>
        <div className="card-body" style={{ padding: '16px 18px' }}>
          <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: '22%' }}>Trạng thái</th>
                  <th style={{ width: '78%' }}>Ý nghĩa</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge badge-warning">QUEUED</span></td>
                  <td>Tin nhắn đã được tiếp nhận vào hàng đợi hệ thống và chuẩn bị gửi</td>
                </tr>
                <tr>
                  <td><span className="badge badge-primary">SENT</span></td>
                  <td>Đã gửi thành công sang hạ tầng nhà mạng, đang chờ kết quả phát tin</td>
                </tr>
                <tr>
                  <td><span className="badge badge-success">DELIVERED</span></td>
                  <td>Tin nhắn đã được chuyển phát thành công đến Zalo của người nhận</td>
                </tr>
                <tr>
                  <td><span className="badge badge-danger">FAILED</span></td>
                  <td>Gửi tin không thành công, xem mã lỗi chi tiết trong trường error_code</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
