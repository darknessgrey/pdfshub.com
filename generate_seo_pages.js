const fs = require('fs');
const path = require('path');

const toolsData = {
    merge: {
        title: "PDF Birleştir - Ücretsiz ve Hızlı Online PDF Birleştirme",
        desc: "Birden fazla PDF dosyasını tarayıcınızda %100 güvenli, ultra hızlı ve ücretsiz birleştirin. Dosyalarınız sunucuya yüklenmez.",
        keywords: "pdf birleştir, pdf birleştirme, online pdf birleştir, ücretsiz pdf birleştirme, pdf combine",
        h1: "Online PDF Birleştirme Aracı",
        steps: [
            { title: "Dosyalarınızı Seçin", desc: "Birleştirmek istediğiniz PDF belgelerini sürükleyip bırakın veya 'Bilgisayardan Seç' butonuna tıklayın." },
            { title: "Sıralamayı Ayarlayın", desc: "Listelenen PDF dosyalarını sürükleyerek istediğiniz sıraya dizin." },
            { title: "Birleştirin ve İndirin", desc: "'İşlemi Başlat' butonuna tıklayarak saniyeler içinde tek parça PDF belgenizi indirin." }
        ],
        faq: [
            { q: "Birleştirme işleminde dosya boyutu veya adet sınırı var mı?", a: "Hayır. PDFsHub tamamen tarayıcınızda çalıştığı için dilediğiniz kadar dosyayı ücretsiz ve sınırsız birleştirebilirsiniz." },
            { q: "Yüklediğim PDF dosyaları sunucularda saklanıyor mu?", a: "Kesinlikle hayır. Tüm işlemler doğrudan cihazınızın tarayıcısında WebAssembly ile yapılır, dosyalarınız asla internete iletilmez." }
        ]
    },
    split: {
        title: "PDF Ayır - Sayfaları Böl ve Ayrı PDF Yap",
        desc: "PDF sayfalarını istediğiniz aralıklardan veya tek tek sayfa olarak ayırıp ZIP arşivi halinde ücretsiz indirin.",
        keywords: "pdf ayır, pdf bölme, pdf sayfalarını ayırma, pdf split, online pdf ayırıcı",
        h1: "PDF Ayırma ve Sayfa Bölme Aracı",
        steps: [
            { title: "PDF Belgenizi Yükleyin", desc: "Bölmek istediğiniz PDF dosyasını yükleme alanına bırakın." },
            { title: "Ayırma Tercihinizi Belirleyin", desc: "İster tüm sayfaları ayrı ayrı dosyalara bölün, ister belirleyeceğiniz sayfa aralıklarını seçin." },
            { title: "İndirin", desc: "Ayrılmış PDF sayfalarınızı tek bir ZIP dosyası olarak anında bilgisayarınıza indirin." }
        ],
        faq: [
            { q: "Her sayfa bağımsız bir PDF mi olur?", a: "Evet, tüm sayfaları ayrı ayrı bağımsız PDF dosyaları olarak tek tıkla indirebilirsiniz." },
            { q: "Orijinal dosyam bozulur veya değişir mi?", a: "Hayır, orijinal dosyanız cihazınızda kalır, PDFsHub sadece seçtiğiniz sayfalardan yeni belgeler üretir." }
        ]
    },
    compress: {
        title: "PDF Sıkıştır - Kalite Kaybetmeden PDF Boyutunu Küçült",
        desc: "PDF dosya boyutunu kaliteden ödün vermeden optimize ederek küçültün. E-posta ve web yüklemeleri için idealdir.",
        keywords: "pdf sıkıştır, pdf boyutu küçültme, pdf compress, online pdf sıkıştırma, mb düşürme",
        h1: "PDF Dosya Boyutu Sıkıştırma ve Küçültme",
        steps: [
            { title: "PDF Dosyanızı Seçin", desc: "Boyutunu küçültmek istediğiniz büyük PDF dosyasını yükleyin." },
            { title: "Sıkıştırma Oranını Seçin", desc: "Önerilen veya yüksek sıkıştırma seçeneklerinden ihtiyacınıza uygun olanı seçin." },
            { title: "Küçültülmüş PDF'i İndirin", desc: "Optimize edilmiş, boyutu küçültülmüş belgenizi anında indirin." }
        ],
        faq: [
            { q: "Sıkıştırma sonrasında metinler ve resimler bozulur mu?", a: "Akıllı sıkıştırma algoritmamız görsel kalitesini yüksek tutarken gereksiz meta verileri ve akışları optimize eder." },
            { q: "E-posta kotasına takılan PDF'ler için uygun mu?", a: "Evet, özellikle e-posta eki limitlerini aşan büyük PDF'ler için en etkili çözümdür." }
        ]
    },
    word2pdf: {
        title: "Word'den PDF'e Dönüştürücü - DOCX to PDF",
        desc: "Microsoft Word (.docx) belgelerinizi tarayıcınızda anında, güvenli ve ücretsiz olarak yüksek kaliteli PDF'e dönüştürün.",
        keywords: "word pdf dönüştür, word to pdf, docx pdf yapma, word dosyasını pdf yap",
        h1: "Online Word (.docx) - PDF Dönüştürücü",
        steps: [
            { title: "Word Dosyasını Yükleyin", desc: ".docx uzantılı belgenizi sürükleyin veya seçin." },
            { title: "Dönüştürmeyi Başlatın", desc: "'İşlemi Başlat' butonuna tıklayarak Word içeriğini PDF yapısına aktarın." },
            { title: "PDF Olarak İndirin", desc: "Yazı tipleri ve mizanpajı korunan PDF dosyanızı anında indirin." }
        ],
        faq: [
            { q: "Word programı yüklü olmadan çalışır mı?", a: "Evet! Bilgisayarınızda Microsoft Word veya Office yüklü olması gerekmez." }
        ]
    },
    pdf2word: {
        title: "PDF'ten Word'e Dönüştürücü - PDF to Word (DOC)",
        desc: "PDF belgelerinizdeki metinleri çıkararak düzenlenebilir Word (.doc) belgesine ücretsiz dönüştürün.",
        keywords: "pdf word dönüştür, pdf to word, pdf docx çevirme, pdf metin aktarma",
        h1: "PDF'ten Word'e Dönüştürme Aracı",
        steps: [
            { title: "PDF Dosyasını Yükleyin", desc: "Word'e dönüştürmek istediğiniz PDF belgesini yükleyin." },
            { title: "Metinleri Ayrıştırın", desc: "İşlem butonu ile belge içerisindeki metin bloklarının çıkarılmasını sağlayın." },
            { title: "Word Belgenizi Alın", desc: "Düzenlenebilir Word dosyanızı tek tıkla indirin." }
        ],
        faq: [
            { q: "Metinleri Word içinde düzenleyebilir miyim?", a: "Evet, çıkarılan belge Microsoft Word, Google Docs ve LibreOffice ile tamamen düzenlenebilir." }
        ]
    },
    excel2pdf: {
        title: "Excel'den PDF'e Dönüştürücü - XLSX to PDF",
        desc: "Excel (.xlsx, .xls) elektronik tablolarınızı okunabilir, düzenli ve yazdırılabilir PDF belgelerine çevirin.",
        keywords: "excel pdf yapma, excel to pdf, xlsx to pdf dönüştürme",
        h1: "Excel Tablolarını PDF'e Dönüştürün",
        steps: [
            { title: "Excel Dosyasını Ekleyin", desc: ".xlsx veya .xls tablonuzu yükleyin." },
            { title: "Tabloyu Hazırlayın", desc: "İşlem başlat butonuyla sayfaların PDF formatına uyarlanmasını sağlayın." },
            { title: "Yazdırılabilir PDF'i İndirin", desc: "Hücreleri düzgünce hizalanmış PDF dosyanızı indirin." }
        ],
        faq: [
            { q: "Çok sayfalı Excel tabloları desteklenir mi?", a: "Evet, tüm sayfalar ve satırlar otomatik olarak PDF sayfalarına paylaştırılır." }
        ]
    },
    pdf2excel: {
        title: "PDF'ten Excel'e Dönüştürücü - PDF to XLSX",
        desc: "PDF içindeki tablo ve sayısal verileri otomatik tespit edip Excel (.xlsx) tablosuna dönüştürün.",
        keywords: "pdf excel dönüştür, pdf to excel, pdf tablo aktar, pdf xlsx",
        h1: "PDF Belgelerini Excel Tablosuna Aktarın",
        steps: [
            { title: "PDF Tablonuzu Yükleyin", desc: "Veri veya tablo içeren PDF dosyanızı seçin." },
            { title: "Verileri Çıkarın", desc: "Yapay zeka ve ayrıştırma algoritmasıyla verilerin taranmasını sağlayın." },
            { title: "XLSX Olarak İndirin", desc: "Hücrelere ayrılmış düzenlenebilir Excel dosyanızı kaydedin." }
        ],
        faq: [
            { q: "Tablodaki formüller korunur mu?", a: "PDF hücrelerindeki metin ve sayısal değerler eksiksiz Excel hücrelerine aktarılır." }
        ]
    },
    jpg2pdf: {
        title: "JPG'den PDF'e Dönüştürücü - Resimleri PDF Yap",
        desc: "JPG ve PNG fotoğraflarınızı tek bir yüksek çözünürlüklü PDF belgesine dönüştürün. Sayfa yönünü ve sıralamayı ayarlayın.",
        keywords: "jpg pdf dönüştür, resimleri pdf yapma, fotoğrafları pdf yap, image to pdf",
        h1: "JPG ve PNG Resimlerini PDF'e Dönüştürün",
        steps: [
            { title: "Resimleri Ekleyin", desc: "Bir veya birden fazla JPG / PNG fotoğrafını sürükleyin." },
            { title: "Yön ve Sıralamayı Belirleyin", desc: "Dikey veya yatay sayfa yönünü belirleyin." },
            { title: "PDF Albümünüzü İndirin", desc: "Tüm fotoğraflarınızın birleştiği kaliteli PDF'i kaydedin." }
        ],
        faq: [
            { q: "Birden fazla resmi tek bir PDF yapabilir miyim?", a: "Evet, dilediğiniz kadar resmi tek bir PDF dosyasında birleştirebilirsiniz." }
        ]
    },
    pdf2jpg: {
        title: "PDF'ten JPG'e Dönüştürücü - PDF to JPG",
        desc: "PDF sayfalarınızı yüksek kaliteli JPG resimleri olarak dışa aktarın ve ZIP olarak tek tıkla indirin.",
        keywords: "pdf jpg dönüştür, pdf to jpg, pdf resim yapma, pdf sayfalarını resme çevir",
        h1: "PDF Sayfalarını JPG Resimlerine Dönüştürün",
        steps: [
            { title: "PDF Belgesini Yükleyin", desc: "Resme dönüştürmek istediğiniz PDF dosyasını seçin." },
            { title: "Sayfaları İşleyin", desc: "'İşlemi Başlat' butonuna basarak sayfaların yüksek çözünürlükte çizilmesini sağlayın." },
            { title: "JPG Olarak İndirin", desc: "Tüm sayfaların JPG hallerini ZIP arşivi olarak indirin." }
        ],
        faq: [
            { q: "Resimlerin çözünürlüğü yüksek mi?", a: "Evet, metinlerin ve görsellerin net okunabilmesi için yüksek DPI çözünürlükte çıktı üretilir." }
        ]
    },
    protect: {
        title: "PDF Şifrele - PDF Dosyalarını Parola ile Koruyun",
        desc: "PDF belgelerinize güçlü açılış şifresi ekleyerek gizliliğinizi koruyun. İstemci taraflı %100 güvenli şifreleme.",
        keywords: "pdf şifrele, pdf parola koyma, pdf kilitleme, protect pdf",
        h1: "PDF Dosyalarını Güçlü Parola ile Şifreleyin",
        steps: [
            { title: "PDF Dosyanızı Seçin", desc: "Korumak istediğiniz belgeyi yükleyin." },
            { title: "Şifrenizi Belirleyin", desc: "Belgenin açılması için gereken güçlü parolayı girin." },
            { title: "Şifreli PDF'i İndirin", desc: "Parola korumalı güvenli PDF'inizi indirin." }
        ],
        faq: [
            { q: "Şifremi unutursam kurtarabilir miyim?", a: "Parola şifrelemesi doğrudan belgeye uygulandığı için parolanızı mutlaka güvenli bir yerde saklayınız." }
        ]
    },
    unlock: {
        title: "PDF Şifre Çöz - PDF Korumasını Kaldır",
        desc: "Şifresini bildiğiniz PDF dosyalarından parola korumasını kalıcı olarak kaldırın ve serbestçe kullanın.",
        keywords: "pdf şifre çöz, pdf kilit kaldırma, pdf unlock, şifreli pdf açma",
        h1: "PDF Dosyalarındaki Şifre Korumasını Kaldırın",
        steps: [
            { title: "Şifreli PDF'i Yükleyin", desc: "Korumalı dosyanızı yükleme alanına bırakın." },
            { title: "Mevcut Şifreyi Girin", desc: "Belgenin mevcut şifresini yazın." },
            { title: "Korumasız Olarak İndirin", desc: "Artık şifre sormayan serbest PDF dosyanızı indirin." }
        ],
        faq: [
            { q: "Şifresini bilmediğim dosyaları kırabilir miyim?", a: "PDFsHub yasal güvenlik standartlarına uyar; şifre kaldırma işlemi için belgenin parolasını biliyor olmanız gerekir." }
        ]
    },
    edit: {
        title: "PDF Düzenle - Online Ücretsiz PDF Editörü",
        desc: "Tarayıcınızda doğrudan PDF üzerine metin ekleyin, serbest çizim yapın, şekil ve resim ekleyin. Kolay ve ücretsiz PDF editörü.",
        keywords: "pdf düzenle, online pdf editör, pdf üzerine yazı yazma, edit pdf",
        h1: "Online ve Ücretsiz PDF Düzenleyici",
        steps: [
            { title: "Düzenlenecek PDF'i Açın", desc: "Belgenizi yükleyin ve düzenleme moduna geçin." },
            { title: "Metin ve Çizim Ekleyin", desc: "Araç çubuğunu kullanarak istediğiniz yere metin, kutu veya çizim yerleştirin." },
            { title: "Kaydedin ve İndirin", desc: "Değişikliklerin uygulandığı yeni PDF belgenizi indirin." }
        ],
        faq: [
            { q: "Program kurmam gerekiyor mu?", a: "Hayır. Adobe Acrobat veya harici hiçbir programa gerek olmadan tarayıcınızda çalışır." }
        ]
    },
    sign: {
        title: "PDF İmzalama - Belgelere Dijital İmza Ekle",
        desc: "Kendi imzanızı çizerek veya görsel olarak yükleyerek PDF belgelerinize anında ekleyin.",
        keywords: "pdf imza ekle, online pdf imzalama, sign pdf, pdf e-imza",
        h1: "PDF Belgelerinize Hızlıca İmza Ekleyin",
        steps: [
            { title: "İmzalanacak PDF'i Yükleyin", desc: "Belgenizi seçin." },
            { title: "İmzanızı Oluşturun", desc: "İmzanızı ekranda çizin veya şeffaf PNG imza dosyanızı yükleyin." },
            { title: "Konumlandırın ve İndirin", desc: "İmzanızı belgenin dilediğiniz sayfasına ve yerine yerleştirip indirin." }
        ],
        faq: [
            { q: "İmzam üçüncü kişilerle paylaşılır mı?", a: "Asla! İmzanız tamamen tarayıcınızda işlenir ve sekme kapandığında silinir." }
        ]
    },
    watermark: {
        title: "PDF Filigran Ekle - Belgelere Filigran Basın",
        desc: "PDF sayfalarınıza şeffaf metin mühürleri ve filigranlar (Örn: GIZLIDIR, TASLAK) ekleyin.",
        keywords: "pdf filigran ekle, pdf watermark, pdf mühür basma, telif hakkı filigranı",
        h1: "PDF Sayfalarına Özel Filigran Ekleyin",
        steps: [
            { title: "PDF Dosyanızı Ekleyin", desc: "Filigran basmak istediğiniz belgeyi yükleyin." },
            { title: "Filigran Metnini Belirleyin", desc: "'GIZLIDIR', 'KOPYALANAMAZ' vb. metninizi yazın." },
            { title: "Damgalı Belgeyi İndirin", desc: "Her sayfasına filigran basılmış yeni belgenizi indirin." }
        ],
        faq: [
            { q: "Filigran belgedeki metinleri kapatır mı?", a: "Hayır, filigran yarı saydam olarak eklendiği için altındaki metinler okunmaya devam eder." }
        ]
    },
    rotate: {
        title: "PDF Döndür - Yan veya Ters Sayfaları Düzelt",
        desc: "Ters veya yan duran PDF sayfalarınızı 90, 180 veya 270 derece döndürerek kalıcı olarak kaydedin.",
        keywords: "pdf döndür, pdf rotate, pdf sayfalarını çevirme, yan duran pdf düzeltme",
        h1: "PDF Sayfalarını İstediğiniz Yöne Döndürün",
        steps: [
            { title: "Belgenizi Yükleyin", desc: "Döndürmek istediğiniz PDF dosyasını açın." },
            { title: "Döndürme Açısını Seçin", desc: "Sağa 90°, Sola 90° veya 180° ters çevirme seçeneklerinden birini belirleyin." },
            { title: "Düzeltilmiş PDF'i İndirin", desc: "Tüm sayfaları doğru yöne getirilmiş dosyanızı indirin." }
        ],
        faq: [
            { q: "Döndürme işlemi kalıcı mıdır?", a: "Evet, kaydedilen yeni PDF dosyası tüm cihazlarda doğru yönde açılır." }
        ]
    },
    pagenumbers: {
        title: "PDF Sayfa Numarası Ekle - Sayfaları Numaralandırın",
        desc: "PDF belgelerinizin köşelerine veya ortasına otomatik sayfa numarası yerleştirin.",
        keywords: "pdf sayfa numarası ekle, pdf sayfa numaralandırma, page numbers pdf",
        h1: "PDF Belgelerinize Kolayca Sayfa Numarası Ekleyin",
        steps: [
            { title: "PDF'inizi Seçin", desc: "Numaralandırmak istediğiniz belgeyi yükleyin." },
            { title: "Numara Konumunu Belirleyin", desc: "Sağ alt, orta alt veya sağ üst konumu seçin." },
            { title: "Numaralı PDF'i İndirin", desc: "Tüm sayfaları düzenli numaralandırılmış belgenizi alın." }
        ],
        faq: [
            { q: "Mevcut sayfa içeriği silinir mi?", a: "Hayır, sayfa numaraları mevcut içeriğe dokunulmadan kenar boşluğuna eklenir." }
        ]
    },
    crop: {
        title: "PDF Kırp - Sayfa Kenar Boşluklarını Temizleyin",
        desc: "PDF sayfalarındaki gereksiz kenar boşluklarını kırparak belgelerinizi yazıcıya ve mobil ekranlara uyumlu hale getirin.",
        keywords: "pdf kırp, pdf crop, pdf kenar boşluğu silme, pdf kırpma aracı",
        h1: "PDF Sayfalarını Kırpın ve Boşlukları Temizleyin",
        steps: [
            { title: "PDF Belgenizi Yükleyin", desc: "Kırpmak istediğiniz PDF'i seçin." },
            { title: "Kırpma Payını Belirleyin", desc: "Kenarlardan kesilecek payı milimetre cinsinden belirleyin." },
            { title: "Kırpılmış PDF'i İndirin", desc: "Odaklanmış ve temizlenmiş belgenizi kaydedin." }
        ],
        faq: [
            { q: "Kırpma işlemi dosya boyutunu etkiler mi?", a: "Genellikle gereksiz kenarlık verileri temizlendiği için dosya boyutu daha verimli hale gelir." }
        ]
    },
    repair: {
        title: "PDF Tamir Et - Bozuk PDF Dosyalarını Onarın",
        desc: "Açılmayan, bozuk veya hasar görmüş PDF belgelerinin yapısal hatalarını tarayıcınızda otomatik tamir edin.",
        keywords: "pdf tamir et, bozuk pdf onarma, repair pdf, hasarlı pdf düzeltme",
        h1: "Bozuk ve Hasar Görmüş PDF Dosyalarını Onarın",
        steps: [
            { title: "Hasarlı PDF'i Yükleyin", desc: "Hata veren veya açılmayan PDF dosyanızı yükleyin." },
            { title: "Otomatik Onarımı Başlatın", desc: "Dahili onarım motorunun PDF nesnelerini yeniden inşa etmesini bekleyin." },
            { title: "Onarılmış PDF'i İndirin", desc: "Kurtarılan dosyanızı bilgisayarınıza kaydedin." }
        ],
        faq: [
            { q: "Her bozuk dosya kurtarılabilir mi?", a: "Dosya yapısındaki çapraz referans tablosu (XREF) ve sayfa gövdeleri mevcut olduğu sürece başarı oranı çok yüksektir." }
        ]
    },
    ocr: {
        title: "OCR PDF - Taranmış Belgelerden Metin Çıkarın",
        desc: "Taranmış resim veya görsel PDF belgelerindeki metinleri gelişmiş OCR teknolojisiyle otomatik okuyup çıkarın.",
        keywords: "ocr pdf, taranmış pdf metne çevirme, pdf ocr online, görselden metin alma",
        h1: "Taranmış PDF ve Belgeler İçin Online OCR",
        steps: [
            { title: "Belgenizi Yükleyin", desc: "Metin çıkarmak istediğiniz taranmış PDF'i yükleyin." },
            { title: "Dili Seçin", desc: "Türkçe, İngilizce veya ilgili belge dilini seçin." },
            { title: "Metin Dosyasını İndirin", desc: "Yapay zeka ile taranıp çıkarılan metinlerinizi anında indirin." }
        ],
        faq: [
            { q: "Türkçe karakter desteği var mı?", a: "Evet, Türkçe harfler (ç, ğ, ı, ö, ş, ü) ve özel karakterler eksiksiz tanınır." }
        ]
    },
    ppt2pdf: {
        title: "PPT'den PDF'e Dönüştürücü - Sunumu PDF Yap",
        desc: "PowerPoint (.pptx) sunum dosyalarınızın metinlerini hızlıca PDF belgesine dönüştürün.",
        keywords: "ppt pdf dönüştür, powerpoint pdf yapma, ppt to pdf, slayt pdf çevirme",
        h1: "PowerPoint Sunumlarını PDF'e Dönüştürün",
        steps: [
            { title: "Sunum Dosyanızı Seçin", desc: ".pptx uzantılı sunumunuzu yükleyin." },
            { title: "Dönüştürmeyi Başlatın", desc: "Slayt metinlerinin PDF formatına aktarılmasını onaylayın." },
            { title: "PDF'inizi İndirin", desc: "Okunabilir PDF sunum belgenizi alın." }
        ],
        faq: [
            { q: "PowerPoint yüklü olması gerekir mi?", a: "Hayır, hiçbir Microsoft uygulamasına ihtiyaç duymadan doğrudan tarayıcıda çalışır." }
        ]
    },
    pdf2ppt: {
        title: "PDF'ten PPT'ye Dönüştürücü - PDF to PowerPoint",
        desc: "PDF sayfalarınızı düzenlenebilir sunum slaytlarına (.pptx) dönüştürün.",
        keywords: "pdf ppt dönüştür, pdf to powerpoint, pdf slayt yapma",
        h1: "PDF Belgelerinizi PowerPoint Slaytlarına Dönüştürün",
        steps: [
            { title: "PDF Belgenizi Yükleyin", desc: "Sunum yapmak istediğiniz PDF dosyasını seçin." },
            { title: "Dönüştürmeyi Başlatın", desc: "Sayfaların slaytlara dönüştürülmesini sağlayın." },
            { title: "PowerPoint Olarak İndirin", desc: "Düzenlenebilir PPTX dosyanızı indirin." }
        ],
        faq: [
            { q: "Oluşan dosya PowerPoint'te açılır mı?", a: "Evet, Microsoft PowerPoint, Keynote ve Google Slides ile tam uyumludur." }
        ]
    },
    redact: {
        title: "PDF Redakte Et - Hassas Bilgileri Siyah Bantla Kapat",
        desc: "PDF üzerindeki T.C. kimlik no, kredi kartı, adres veya gizli verilerin üzerini kalıcı olarak siyah bantla kapatın.",
        keywords: "pdf redakte et, pdf sansürleme, pdf siyah bant çekme, redact pdf",
        h1: "PDF Belgelerinizdeki Gizli Bilgileri Güvenle Sansürleyin",
        steps: [
            { title: "Belgenizi Yükleyin", desc: "Hassas bilgi içeren PDF'i açın." },
            { title: "Gizlenecek Alanları Seçin", desc: "Kapatmak istediğiniz metin veya alanları fareyle işaretleyin." },
            { title: "Kalıcı Olarak Sansürleyin", desc: "Verilerin geri alınamayacak şekilde karartıldığı yeni PDF'i indirin." }
        ],
        faq: [
            { q: "Siyah bantın altındaki metin seçilebilir veya kopyalanabilir mi?", a: "Hayır! Karartılan bölge kalıcı olarak silinir ve rasterize edilir, altındaki veri tamamen yok edilir." }
        ]
    },
    compare: {
        title: "PDF Karşılaştır - İki Belge Arasındaki Farkları Bul",
        desc: "İki PDF belgesi arasındaki metin ve içerik farklarını tarayıcınızda satır satır analiz edip renkli olarak gösterin.",
        keywords: "pdf karşılaştır, pdf fark bulma, compare pdf, iki pdf arasındaki farklar",
        h1: "İki PDF Arasındaki Farkları Anında Karşılaştırın",
        steps: [
            { title: "İki Dosyayı Seçin", desc: "Karşılaştırmak istediğiniz orijinal ve revize PDF'leri yükleyin." },
            { title: "Farkları Taratın", desc: "Akıllı diff motorumuzun iki belgeyi satır satır eşleştirmesini bekleyin." },
            { title: "Fark Raporunu İnceleyin", desc: "Eklenen, silinen ve değişen metinleri renkli panelle inceleyin." }
        ],
        faq: [
            { q: "Sözleşme ve teklif incelemelerinde kullanılabilir mi?", a: "Evet, özellikle revize edilen sözleşmelerdeki değişiklikleri saniyeler içinde yakalamak için idealdir." }
        ]
    },
    scantopdf: {
        title: "Tarat ve PDF Yap - Kameradan Anında PDF Oluştur",
        desc: "Telefon veya bilgisayar kameranızı kullanarak fiziksel kağıt ve belgelerinizi tarayıp tek tıkla PDF yapın.",
        keywords: "kamera ile pdf yapma, belge tarama pdf, scan to pdf, evrak tarayıcı",
        h1: "Kameranızı Kullanarak Kağıt Belgeleri PDF'e Dönüştürün",
        steps: [
            { title: "Kameranızı Başlatın", desc: "Kamera iznini onaylayarak tarayıcı kamerasını açın." },
            { title: "Sayfaları Fotoğraflayın", desc: "Belgenizin sayfalarını sırayla çekin." },
            { title: "PDF Olarak Kaydedin", desc: "Çektiğiniz tüm sayfaları birleştirip PDF olarak indirin." }
        ],
        faq: [
            { q: "Mobil cihazlarda çalışır mı?", a: "Evet, akıllı telefonunuzun arka kamerasıyla yüksek çözünürlüklü tarama yapabilirsiniz." }
        ]
    },
    organizepages: {
        title: "Sayfaları Düzenle/Sil - PDF Sayfa Sırasını Değiştir",
        desc: "PDF sayfalarını küçük resimler halinde görüntüleyin, sürükleyerek yerlerini değiştirin ve istemediğiniz sayfaları tek tıkla silin.",
        keywords: "pdf sayfa silme, pdf sayfa sıralama, pdf organize, delete pdf pages",
        h1: "PDF Sayfalarını Yeniden Düzenleyin veya İstenmeyenleri Silin",
        steps: [
            { title: "PDF Dosyasını Yükleyin", desc: "Sayfalarını düzenlemek istediğiniz belgeyi açın." },
            { title: "Sıralayın veya Silin", desc: "Sayfa kartlarını sürükleyerek yer değiştirin veya çöp kutusu ikonuyla silin." },
            { title: "Yeni PDF'i Alın", desc: "Düzenlenmiş yeni sayfa düzenine sahip belgenizi indirin." }
        ],
        faq: [
            { q: "Yanlışlıkla sayfa silersem ne olur?", a: "Kaydet butonuna basana kadar dilediğiniz gibi sayfaları geri alabilir veya işlemi yeniden başlatabilirsiniz." }
        ]
    },
    html2pdf: {
        title: "HTML'den PDF'e Dönüştürücü - Web Sayfasını PDF Yap",
        desc: "HTML kodlarını veya web içeriklerini tarayıcınızda temiz, düzenli ve yazdırılabilir PDF belgesine dönüştürün.",
        keywords: "html pdf yapma, html to pdf, web sayfası pdf çevirme",
        h1: "HTML İçeriklerini ve Web Sayfalarını PDF'e Dönüştürün",
        steps: [
            { title: "HTML Kodunuzu Girin", desc: "Dönüştürmek istediğiniz HTML kodunu veya metni yapıştırın." },
            { title: "Önizlemeyi İnceleyin", desc: "Biçimlendirmenin PDF sayfasına uygunluğunu kontrol edin." },
            { title: "PDF'i İndirin", desc: "Stil ve görselleriyle beraber PDF belgenizi indirin." }
        ],
        faq: [
            { q: "CSS stilleri korunur mu?", a: "Evet, standart CSS stilleri PDF çıktısına birebir yansıtılır." }
        ]
    },
    pdf2pdfa: {
        title: "PDF Bilgilerini Güncelle - PDF Metadata Düzenleyici",
        desc: "PDF belgenizin başlık, yazar ve oluşturucu (creator) bilgilerini güncelleyin.",
        keywords: "pdf metadata güncelle, pdf bilgi düzenleme, pdf creator değiştirme",
        h1: "PDF Belge Bilgilerini ve Metaverilerini Düzenleyin",
        steps: [
            { title: "PDF Dosyanızı Seçin", desc: "Metaverilerini değiştirmek istediğiniz PDF'i yükleyin." },
            { title: "İşlemi Onaylayın", desc: "PDFsHub etiket ve oluşturucu bilgilerini güncelleyin." },
            { title: "Güncel Belgeyi İndirin", desc: "Metaverileri yenilenmiş dosyanızı indirin." }
        ],
        faq: [
            { q: "Bu işlem PDF içeriğini değiştirir mi?", a: "Hayır, sadece belgenin künye (metaveri) bilgilerini günceller; sayfa içeriklerine dokunmaz." }
        ]
    }
};

const baseHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Ensure index.html tool cards are crawlable <a> tags instead of just <div>
let updatedIndex = baseHtml;
for (const toolId of Object.keys(toolsData)) {
    const cardPattern = new RegExp(`<div class="tool-card" onclick="showTool\\('${toolId}'\\)">`, 'g');
    updatedIndex = updatedIndex.replace(cardPattern, `<a href="${toolId}.html" class="tool-card" onclick="event.preventDefault(); showTool('${toolId}')">`);
}
fs.writeFileSync(path.join(__dirname, 'index.html'), updatedIndex, 'utf8');
console.log("index.html updated with SEO crawlable internal links!");

// Extract common sections from index.html
function generatePageForTool(toolId, info) {
    let page = updatedIndex;

    // 1. Update Title, Meta Description, Canonical, OG
    page = page.replace(/<title>[^<]*<\/title>/, `<title>${info.title} | PDFsHub</title>`);
    page = page.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${info.desc}">`);
    page = page.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://pdfshub.com/${toolId}.html">`);
    page = page.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${info.title} | PDFsHub">`);
    page = page.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${info.desc}">`);
    page = page.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="https://pdfshub.com/${toolId}.html">`);
    page = page.replace(/<meta property="twitter:title" content="[^"]*">/, `<meta property="twitter:title" content="${info.title} | PDFsHub">`);
    page = page.replace(/<meta property="twitter:description" content="[^"]*">/, `<meta property="twitter:description" content="${info.desc}">`);
    page = page.replace(/<meta property="twitter:url" content="[^"]*">/, `<meta property="twitter:url" content="https://pdfshub.com/${toolId}.html">`);

    // 2. Set <body data-tool="...">
    page = page.replace(/<body>/, `<body data-tool="${toolId}">`);

    // 3. Make #view-home inactive and #view-tool active with pre-rendered title & desc
    page = page.replace('<section id="view-home" class="view active">', '<section id="view-home" class="view" style="display:none;">');
    page = page.replace('<section id="view-tool" class="view">', '<section id="view-tool" class="view active">');
    page = page.replace('<h2 id="tool-title">Araç Başlığı</h2>', `<h2 id="tool-title">${info.title.split(' - ')[0]}</h2>`);
    page = page.replace('<p id="tool-desc">Araç açıklaması buraya gelecek.</p>', `<p id="tool-desc">${info.desc}</p>`);

    // 4. Build Rich SEO How-to & FAQ Section for this tool
    const stepsHtml = info.steps.map((s, i) => `
        <div style="background:var(--bg-color); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.5rem; display:flex; gap:1.2rem; align-items:flex-start;">
            <div style="background:var(--primary); color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0;">${i+1}</div>
            <div>
                <h4 style="font-weight:700; margin-bottom:0.4rem; color:var(--text-main); font-size:1.05rem;">${s.title}</h4>
                <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin:0;">${s.desc}</p>
            </div>
        </div>
    `).join('');

    const faqHtml = info.faq.map(f => `
        <div style="background:var(--bg-color); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.4rem; margin-bottom:1rem;">
            <h4 style="font-weight:700; margin-bottom:0.5rem; color:var(--text-main); font-size:1rem;"><i class="fa-regular fa-circle-question" style="color:var(--primary); margin-right:6px;"></i> ${f.q}</h4>
            <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin:0;">${f.a}</p>
        </div>
    `).join('');

    const seoArticle = `
    <!-- Dedicated Tool SEO How-To & Knowledge Base -->
    <article class="tool-seo-guide" style="max-width: 900px; margin: 4rem auto 2rem auto; padding: 0 1rem; width: 100%;">
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
            <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 1.2rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${info.h1}</h2>
            <p style="color: var(--text-muted); font-size: 0.98rem; line-height: 1.8; margin-bottom: 2rem;">${info.desc} PDFsHub ile belgeleriniz hiçbir sunucuya yüklenmeden, doğrudan tarayıcınızın donanım ivmesi ve WebAssembly teknolojisiyle en yüksek gizlilik standartlarında işlenir.</p>
            
            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; color: var(--text-main);">Nasıl Kullanılır? (3 Kolay Adım)</h3>
            <div style="display: grid; gap: 1rem; margin-bottom: 2.5rem;">
                ${stepsHtml}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
                <div style="background: var(--bg-color); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem;">
                    <h4 style="color: var(--primary); font-weight: 700; margin-bottom: 0.5rem;"><i class="fa-solid fa-shield-halved"></i> %100 Güvenli ve Gizli</h4>
                    <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin: 0;">Dosyalarınız cihazınızdan dışarı çıkmaz. İnternet bağlantınız kopsa dahi işlem yapabilirsiniz.</p>
                </div>
                <div style="background: var(--bg-color); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem;">
                    <h4 style="color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;"><i class="fa-solid fa-bolt"></i> Anında Hızlı Sonuç</h4>
                    <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin: 0;">Yükleme ve indirme bekleme süreleri olmadan, tarayıcınızın tam gücüyle çalışır.</p>
                </div>
                <div style="background: var(--bg-color); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem;">
                    <h4 style="color: #10b981; font-weight: 700; margin-bottom: 0.5rem;"><i class="fa-solid fa-coins"></i> Tamamen Ücretsiz</h4>
                    <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin: 0;">Üyelik veya kredi kartı gerektirmez. Sınırsız kullanabilirsiniz.</p>
                </div>
            </div>

            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; color: var(--text-main);">Sıkça Sorulan Sorular</h3>
            <div>
                ${faqHtml}
            </div>

            <div style="text-align: center; margin-top: 2rem;">
                <a href="index.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: var(--radius-md); font-weight: 600;">
                    <i class="fa-solid fa-arrow-left"></i> Tüm PDF Araçlarını Gör
                </a>
            </div>
        </div>
    </article>
    `;

    // Insert article right before </section> of view-tool
    page = page.replace('<!-- Sleek Feedback Modal (Triggered on Success/Error) -->', `${seoArticle}\n\n            <!-- Sleek Feedback Modal (Triggered on Success/Error) -->`);

    // 5. Update JSON-LD structured data for this tool
    const toolSchema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                "name": `PDFsHub - ${info.title.split(' - ')[0]}`,
                "url": `https://pdfshub.com/${toolId}.html`,
                "operatingSystem": "All",
                "applicationCategory": "BusinessApplication",
                "browserRequirements": "Requires HTML5 Canvas and JavaScript",
                "description": info.desc,
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": info.faq.map(f => ({
                    "@type": "Question",
                    "name": f.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f.a
                    }
                }))
            }
        ]
    };

    page = page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n    ${JSON.stringify(toolSchema, null, 4)}\n    </script>`);

    return page;
}

// Generate all 27 pages
for (const [toolId, info] of Object.entries(toolsData)) {
    const htmlContent = generatePageForTool(toolId, info);
    fs.writeFileSync(path.join(__dirname, `${toolId}.html`), htmlContent, 'utf8');
}
console.log(`Generated ${Object.keys(toolsData).length} dedicated tool HTML pages!`);

// Generate updated sitemap.xml
const sitemapUrls = [
    { loc: "https://pdfshub.com/", priority: "1.0", changefreq: "daily" }
];

for (const toolId of Object.keys(toolsData)) {
    sitemapUrls.push({
        loc: `https://pdfshub.com/${toolId}.html`,
        priority: ["merge", "split", "compress", "word2pdf", "pdf2word", "ocr", "edit", "sign"].includes(toolId) ? "0.9" : "0.8",
        changefreq: "weekly"
    });
}
sitemapUrls.push({ loc: "https://pdfshub.com/privacy.html", priority: "0.3", changefreq: "monthly" });

const today = "2026-10-13";
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${u.changefreq}</changefreq>
        <priority>${u.priority}</priority>
    </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf8');
console.log(`sitemap.xml updated with ${sitemapUrls.length} real indexable URLs!`);

// Create .htaccess
const htaccessContent = `# PDFsHub LiteSpeed/Apache Optimization Rules
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/x-javascript application/json application/xml image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/x-javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/wasm "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}\\.html -f
  RewriteRule ^(.*)$ $1.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(__dirname, '.htaccess'), htaccessContent, 'utf8');
console.log(".htaccess created!");
