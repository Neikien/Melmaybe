'use client';

import { useState } from 'react';

// Các bộ dữ liệu mẫu để demo nhanh trên lớp
const PRESETS = [
  {
    name: 'Ví dụ chuẩn trên Slide (A, C, C, G)',
    seqs: { L1: 'A', L2: 'C', L3: 'C', L4: 'G' },
    topology: '((L1,L2),(L3,L4))',
  },
  {
    name: 'Ví dụ có đột biến (A, A, G, G)',
    seqs: { L1: 'A', L2: 'A', L3: 'G', L4: 'G' },
    topology: '((L1,L2),(L3,L4))',
  },
  {
    name: 'Ví dụ xung đột toàn bộ (A, C, G, T)',
    seqs: { L1: 'A', L2: 'C', L3: 'G', L4: 'T' },
    topology: '((L1,L2),(L3,L4))',
  },
  {
    name: 'Ví dụ đa vị trí - 4 cột (ACGT vs AGGT...)',
    seqs: { L1: 'ACGA', L2: 'ACGT', L3: 'AGCA', L4: 'GGGT' },
    topology: '((L1,L2),(L3,L4))',
  },
];

// Hàm giải thuật toán Fitch cho 1 cột (site) trên cây 4 lá
function solveFitchSingleSite(leaves, topology) {
  let order = ['L1', 'L2', 'L3', 'L4'];
  if (topology === '((L1,L3),(L2,L4))') order = ['L1', 'L3', 'L2', 'L4'];
  if (topology === '((L1,L4),(L2,L3))') order = ['L1', 'L4', 'L2', 'L3'];

  const [a, b, c, d] = order;
  const setA = new Set([leaves[a]]);
  const setB = new Set([leaves[b]]);
  const setC = new Set([leaves[c]]);
  const setD = new Set([leaves[d]]);

  // Pha 1: Bottom-Up (Hậu thứ tự)
  const intersect = (s1, s2) => new Set([...s1].filter((x) => s2.has(x)));
  const union = (s1, s2) => new Set([...s1, ...s2]);

  // Nút trung gian trái (U)
  const interU = intersect(setA, setB);
  const isInterU = interU.size > 0;
  const setU = isInterU ? interU : union(setA, setB);
  const costU = isInterU ? 0 : 1;

  // Nút trung gian phải (V)
  const interV = intersect(setC, setD);
  const isInterV = interV.size > 0;
  const setV = isInterV ? interV : union(setC, setD);
  const costV = isInterV ? 0 : 1;

  // Nút gốc (Root)
  const interR = intersect(setU, setV);
  const isInterR = interR.size > 0;
  const setR = isInterR ? interR : union(setU, setV);
  const costR = isInterR ? 0 : 1;

  const totalScore = costU + costV + costR;

  // Pha 2: Top-Down (Tiền thứ tự)
  const finalR = [...setR][0];
  const finalU = setU.has(finalR) ? finalR : [...setU][0];
  const finalV = setV.has(finalR) ? finalR : [...setV][0];

  return {
    order,
    leaves: {
      [a]: leaves[a],
      [b]: leaves[b],
      [c]: leaves[c],
      [d]: leaves[d],
    },
    U: { set: [...setU], op: isInterU ? 'Giao (∩)' : 'Hợp (∪)', cost: costU, final: finalU },
    V: { set: [...setV], op: isInterV ? 'Giao (∩)' : 'Hợp (∪)', cost: costV, final: finalV },
    Root: { set: [...setR], op: isInterR ? 'Giao (∩)' : 'Hợp (∪)', cost: costR, final: finalR },
    totalScore,
  };
}

export default function FitchSimulatorPage() {
  const [seqs, setSeqs] = useState({ L1: 'A', L2: 'C', L3: 'C', L4: 'G' });
  const [topology, setTopology] = useState('((L1,L2),(L3,L4))');
  const [selectedSite, setSelectedSite] = useState(0);
  const [step, setStep] = useState(5);
  
  // State để lưu thông báo lỗi khi nhập sai ký tự
  const [errorMsg, setErrorMsg] = useState('');

  // Chuẩn hóa độ dài chuỗi
  const maxLen = Math.max(
    1,
    seqs.L1.length,
    seqs.L2.length,
    seqs.L3.length,
    seqs.L4.length
  );

  const handleSeqChange = (key, value) => {
    const upperVal = value.toUpperCase();
    // Kiểm tra xem có chứa ký tự nào không phải A, T, C, G không
    const invalidCharRegex = /[^ATCG]/;
    
    if (invalidCharRegex.test(upperVal)) {
      setErrorMsg('⚠️ Chỉ được phép nhập các ký tự A, T, C, G!');
    } else {
      setErrorMsg('');
    }

    // Lọc bỏ hoàn toàn các ký tự khác ngoài A, T, C, G, giới hạn tối đa 12 ký tự
    const cleaned = upperVal.replace(/[^ATCG]/g, '').slice(0, 12);
    
    setSeqs((prev) => ({ ...prev, [key]: cleaned }));
    setSelectedSite(0);
  };

  const applyPreset = (preset) => {
    setSeqs(preset.seqs);
    setTopology(preset.topology);
    setSelectedSite(0);
    setStep(5);
    setErrorMsg('');
  };

  const allSitesResults = [];
  for (let i = 0; i < maxLen; i++) {
    const siteLeaves = {
      L1: seqs.L1[i] || '-',
      L2: seqs.L2[i] || '-',
      L3: seqs.L3[i] || '-',
      L4: seqs.L4[i] || '-',
    };
    allSitesResults.push(solveFitchSingleSite(siteLeaves, topology));
  }

  const grandTotalScore = allSitesResults.reduce((acc, item) => acc + item.totalScore, 0);
  const currentRes = allSitesResults[selectedSite] || allSitesResults[0];
  const [leaf1, leaf2, leaf3, leaf4] = currentRes.order;

  const stepDescriptions = [
    'Bước 0: Khởi tạo trạng thái tại 4 nút lá từ cột dữ liệu (Site) đang chọn.',
    `Bước 1 (Pha 1 - Bottom-Up nút U): Xét ${leaf1} {${currentRes.leaves[leaf1]}} và ${leaf2} {${currentRes.leaves[leaf2]}} ➔ Dùng phép ${currentRes.U.op} được {${currentRes.U.set.join(', ')}} (Chi phí +${currentRes.U.cost}).`,
    `Bước 2 (Pha 1 - Bottom-Up nút V): Xét ${leaf3} {${currentRes.leaves[leaf3]}} và ${leaf4} {${currentRes.leaves[leaf4]}} ➔ Dùng phép ${currentRes.V.op} được {${currentRes.V.set.join(', ')}} (Chi phí +${currentRes.V.cost}).`,
    `Bước 3 (Pha 1 - Bottom-Up nút Gốc): Xét U {${currentRes.U.set.join(', ')}} và V {${currentRes.V.set.join(', ')}} ➔ Dùng phép ${currentRes.Root.op} được {${currentRes.Root.set.join(', ')}} (Chi phí +${currentRes.Root.cost}). Tổng điểm cột này = ${currentRes.totalScore}.`,
    `Bước 4 (Pha 2 - Top-Down chốt Gốc): Từ tập {${currentRes.Root.set.join(', ')}}, chọn trạng thái "${currentRes.Root.final}" cho nút Gốc.`,
    `Bước 5 (Pha 2 - Top-Down hoàn tất): Kế thừa từ Gốc xuống ➔ Nút U chốt "${currentRes.U.final}", Nút V chốt "${currentRes.V.final}". Hoàn thành tái dựng tổ tiên!`,
  ];

  return (
    <div
      style={{
        padding: '32px 24px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1350px',
        margin: '0 auto',
        color: '#1e293b',
      }}
    >
      <h1 style={{ fontSize: '32px', color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>
        Mô phỏng Tương tác Thuật toán Fitch (Maximum Parsimony)
      </h1>
      <p style={{ fontSize: '16px', color: '#64748b', textAlign: 'center', marginBottom: '28px' }}>
        Nhập dữ liệu chuỗi sinh học (chỉ nhận A, T, C, G) hoặc chọn cấu trúc cây để quan sát quá trình duyệt 2 pha
      </p>

      {/* Thanh chọn nhanh ví dụ mẫu */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => applyPreset(p)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Bố cục 2 cột chính */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* CỘT TRÁI: Nhập dữ liệu & Cấu hình cây */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            1. Dữ liệu đầu vào (Character Data)
          </h3>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '16px',
                border: '1px solid #fecaca',
              }}
            >
              {errorMsg}
            </div>
          )}

          {(['L1', 'L2', 'L3', 'L4']).map((label, idx) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  width: '75px',
                  fontWeight: 'bold',
                  color: '#2563eb',
                  fontSize: '15px',
                }}
              >
                Loài {idx + 1} ({label}):
              </span>
              <input
                type="text"
                value={seqs[label]}
                onChange={(e) => handleSeqChange(label, e.target.value)}
                placeholder="VD: ACGT"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                }}
              />
            </div>
          ))}

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
              2. Chọn cấu trúc cây (Topology - Small Parsimony):
            </label>
            <select
              value={topology}
              onChange={(e) => setTopology(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '15px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                fontWeight: 'bold',
              }}
            >
              <option value="((L1,L2),(L3,L4))">Cây 1: ((Loài 1, Loài 2), (Loài 3, Loài 4))</option>
              <option value="((L1,L3),(L2,L4))">Cây 2: ((Loài 1, Loài 3), (Loài 2, Loài 4))</option>
              <option value="((L1,L4),(L2,L3))">Cây 3: ((Loài 1, Loài 4), (Loài 2, Loài 3))</option>
            </select>
          </div>

          {/* Bảng tổng hợp đa vị trí (Multi-site) */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>
              3. Phân tích từng cột (Site Pattern) — Bấm vào cột để xem cây:
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allSitesResults.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSite(idx)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: selectedSite === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: selectedSite === idx ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Cột {idx + 1}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', margin: '4px 0' }}>
                    {seqs.L1[idx] || '-'}{seqs.L2[idx] || '-'}{seqs.L3[idx] || '-'}{seqs.L4[idx] || '-'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>
                    +{res.totalScore} điểm
                  </div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#0f172a',
                color: 'white',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '16px' }}>Tổng Parsimony Score toàn chuỗi:</span>
              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#38bdf8' }}>
                {grandTotalScore} đột biến
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Trực quan hóa sơ đồ cây & Chạy từng bước */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>
              Mô phỏng Cây tiến hóa — Cột #{selectedSite + 1}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStep(0)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Chạy lại từ đầu (Bước 0)
              </button>
              <button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                disabled={step >= 5}
                style={{
                  padding: '8px 16px',
                  backgroundColor: step >= 5 ? '#475569' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: step >= 5 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Bước tiếp theo ➡️
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '14px 18px',
              borderRadius: '8px',
              borderLeft: '4px solid #38bdf8',
              marginBottom: '20px',
              fontSize: '15px',
              lineHeight: '1.5',
              minHeight: '48px',
            }}
          >
            {stepDescriptions[step]}
          </div>

          {/* Sơ đồ cây SVG */}
          <svg viewBox="0 0 600 360" style={{ width: '100%', height: 'auto', backgroundColor: '#1e293b', borderRadius: '10px' }}>
            <line x1="300" y1="65" x2="160" y2="175" stroke={step >= 3 ? '#38bdf8' : '#475569'} strokeWidth="4" />
            <line x1="300" y1="65" x2="440" y2="175" stroke={step >= 3 ? '#38bdf8' : '#475569'} strokeWidth="4" />
            <line x1="160" y1="175" x2="80" y2="295" stroke={step >= 1 ? '#38bdf8' : '#475569'} strokeWidth="4" />
            <line x1="160" y1="175" x2="240" y2="295" stroke={step >= 1 ? '#38bdf8' : '#475569'} strokeWidth="4" />
            <line x1="440" y1="175" x2="360" y2="295" stroke={step >= 2 ? '#38bdf8' : '#475569'} strokeWidth="4" />
            <line x1="440" y1="175" x2="520" y2="295" stroke={step >= 2 ? '#38bdf8' : '#475569'} strokeWidth="4" />

            {/* GỐC */}
            <g transform="translate(300, 65)">
              <rect
                x="-65"
                y="-28"
                width="130"
                height="56"
                rx="10"
                fill={step >= 4 ? '#0284c7' : step >= 3 ? '#334155' : '#0f172a'}
                stroke={step >= 3 ? '#38bdf8' : '#64748b'}
                strokeWidth="3"
              />
              <text x="0" y="-6" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold">
                GỐC (Root)
              </text>
              <text x="0" y="16" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                {step < 3
                  ? '?'
                  : step === 3
                  ? `{${currentRes.Root.set.join(',')}} (+${currentRes.Root.cost})`
                  : `Chốt: ${currentRes.Root.final} (+${currentRes.Root.cost})`}
              </text>
            </g>

            {/* U */}
            <g transform="translate(160, 175)">
              <rect
                x="-65"
                y="-28"
                width="130"
                height="56"
                rx="10"
                fill={step >= 5 ? '#0284c7' : step >= 1 ? '#334155' : '#0f172a'}
                stroke={step >= 1 ? '#38bdf8' : '#64748b'}
                strokeWidth="3"
              />
              <text x="0" y="-6" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold">
                Tổ tiên U ({currentRes.U.op})
              </text>
              <text x="0" y="16" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">
                {step < 1
                  ? '?'
                  : step < 5
                  ? `{${currentRes.U.set.join(',')}} (+${currentRes.U.cost})`
                  : `Chốt: ${currentRes.U.final} (+${currentRes.U.cost})`}
              </text>
            </g>

            {/* V */}
            <g transform="translate(440, 175)">
              <rect
                x="-65"
                y="-28"
                width="130"
                height="56"
                rx="10"
                fill={step >= 5 ? '#0284c7' : step >= 2 ? '#334155' : '#0f172a'}
                stroke={step >= 2 ? '#38bdf8' : '#64748b'}
                strokeWidth="3"
              />
              <text x="0" y="-6" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold">
                Tổ tiên V ({currentRes.V.op})
              </text>
              <text x="0" y="16" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">
                {step < 2
                  ? '?'
                  : step < 5
                  ? `{${currentRes.V.set.join(',')}} (+${currentRes.V.cost})`
                  : `Chốt: ${currentRes.V.final} (+${currentRes.V.cost})`}
              </text>
            </g>

            {/* LÁ */}
            {[
              { x: 80, label: leaf1, val: currentRes.leaves[leaf1] },
              { x: 240, label: leaf2, val: currentRes.leaves[leaf2] },
              { x: 360, label: leaf3, val: currentRes.leaves[leaf3] },
              { x: 520, label: leaf4, val: currentRes.leaves[leaf4] },
            ].map((leaf, i) => (
              <g key={i} transform={`translate(${leaf.x}, 295)`}>
                <rect x="-42" y="-24" width="84" height="48" rx="8" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
                <text x="0" y="-4" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                  {leaf.label}
                </text>
                <text x="0" y="16" textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold">
                  {`{${leaf.val}}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
