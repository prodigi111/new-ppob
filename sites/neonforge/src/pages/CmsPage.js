import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_CONTENT = {
  'tentang-kami': { title: 'Tentang Kami', content: 'BlazeStore adalah platform top-up game dan voucher digital terpercaya di Indonesia. Kami menyediakan layanan top-up cepat, aman, dan dengan harga terbaik.' },
  'kebijakan-privasi': { title: 'Kebijakan Privasi', content: 'Kebijakan privasi BlazeStore menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.' },
  'syarat-ketentuan': { title: 'Syarat & Ketentuan', content: 'Dengan menggunakan layanan BlazeStore, Anda menyetujui syarat dan ketentuan yang berlaku.' },
  'hubungi-kami': { title: 'Hubungi Kami', content: 'Hubungi kami melalui WhatsApp atau email untuk bantuan dan pertanyaan.' },
};

export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/cms/${slug}`);
      const data = res.data;
      if (data.content) {
        setPage(data);
      } else {
        setPage(DEFAULT_CONTENT[slug] || { title: slug, content: '' });
      }
    } catch {
      setPage(DEFAULT_CONTENT[slug] || { title: slug, content: '' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-white text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> Kembali
        </Link>
        <h1 className="font-rajdhani font-bold text-3xl text-white uppercase mb-6">
          {page?.title}
        </h1>
        <div className="bg-card rounded-xl p-6 md:p-8 border border-border prose prose-invert max-w-none">
          {page?.content?.split('\n').map((line, i) => (
            <p key={i} className="text-gray-300 leading-relaxed mb-4">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
