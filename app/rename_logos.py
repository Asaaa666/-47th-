import os

# 部活のキーワードと新しいファイル名の対応表
RENAME_MAP = {
    "歴史": "rekishi.png",
    "鉃道": "tetsudou.png",
    "鉄道": "tetsudou.png",
    "ARCHERz": "archerz.jpg",
    "美術": "bijutsu.png",
    "化学": "kagaku.png",
    "ホラー": "horror.png",
    "物理": "butsuri2026.png",
    "数学": "suugaku.png",
    "びりやーど": "billiard.png",
    "野球": "chugaku_yakyu.jpeg",
    "折り紙": "origami.png",
    "喰い": "kui_com.jpg",
    "団GO": "dango.png",
    "図書研究": "tosyo_kenkyu.png",
    "中２": "chu2_gakunen.png",
    "中2": "chu2_gakunen.png",
    "生物": "seibutsu.png",
    "プラネタリウム": "chigaku_planetarium.png",
    "adu_logo": "adu_logo.png",
    "地学部展示": "chigaku_tenji.png",
    "Cooland": "cooland.png",
    "BEN&KEN": "ben_ken.png",
    "焼きすぎて麺": "yakisugi.png",
    "ポテトヘッド": "potatohead.png",
    "神兵衛": "jinbee.png",
    "りすのおうち": "risu_house.png",
    "アサノ大全": "asano_taizen.png",
    "鶏ッピー": "torippy.jpg",
    "あまねくダンク": "amaneku_dunk.png",
    "クイズ": "quiz.png",
    "的に当てろ屋": "matoni_atero.jpg",
    "書道": "shodou.png",
    "棋道": "kidou.png",
    "登山": "tozambu.png",
    "スクラム": "scrum_shokudou.png",
    "aset_logo": "aset_logo.png",
    "生徒会": "asano_seitokai.png",
    "古本バザー": "furuhon_bazaar.png",
    "KCC": "kcc.png",
    "中１": "chu1_gakunen.png",
    "中1": "chu1_gakunen.png",
    "お化け屋敷": "obake_yashiki.png",
    "レーザータグ": "lasertag.png",
    "総務": "soumu.png",
    "装飾": "soushoku.png",
    "同窓会": "asano_dousoukai.png",
    "賛助会": "sanjokai.png",
    "涼水": "ryosui.png"
}

def main():
    renamed_count = 0
    print("🔍 プロジェクト内を自動探索中...\n")

    # プロジェクト内の全フォルダーを深さに関係なく自動捜索
    for root, dirs, files in os.walk("."):
        # 不要なビルドフォルダーなどはスキップして高速化
        if "node_modules" in root or ".git" in root or ".next" in root:
            continue

        for filename in files:
            for keyword, new_name in RENAME_MAP.items():
                if keyword in filename:
                    old_path = os.path.join(root, filename)
                    new_path = os.path.join(root, new_name)
                    
                    if old_path != new_path:
                        try:
                            os.rename(old_path, new_path)
                            print(f"✅ {filename} ➔ {new_name}")
                            renamed_count += 1
                        except Exception as e:
                            print(f"❌ {filename} の変更失敗: {e}")
                    break

    print(f"\n🎉 完了! {renamed_count} 件の画像名を安全な英数字に変更しました！")

if __name__ == "__main__":
    main()
    
