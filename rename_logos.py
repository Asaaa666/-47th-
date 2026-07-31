import os

# 画像が保存されているフォルダーのパス（※環境に合わせて変更してください）
TARGET_DIR = "public/logos"

# 旧ファイル名 ➔ 新ファイル名（半角英数）の対応表
RENAME_MAP = {
    "歴史研究部_ロゴ.png": "rekishi.png",
    "鉃道研究部_ロゴ.png": "tetsudou.png",
    "ARCHERz_ロゴ.jpg": "archerz.jpg",
    "美術部展＿ロゴ.png": "bijutsu.png",
    "化学部_ロゴ.png": "kagaku.png",
    "ホラー展_ロゴ.png": "horror.png",
    "物理部展2026_ロゴ.png": "butsuri2026.png",
    "数学同好会_ロゴ.png": "suugaku.png",
    "びりやーど研究会_ロゴ.png": "billiard.png",
    "中学野球部_ロゴ.jpeg": "chugaku_yakyu.jpeg",
    "折り紙研究会_ロゴ.png": "origami.png",
    "喰いコミュニケーションXXIV_ロゴ.jpg": "kui_com.jpg",
    "団GO!_ロゴ.png": "dango.png",
    "図書研究部_ロゴ.png": "tosyo_kenkyu.png",
    "中２学年参加_ロゴ.png": "chu2_gakunen.png",
    "生物部_ロゴ.png": "seibutsu.png",
    "地学部プラネタリウム_ロゴ.png": "chigaku_planetarium.png",
    "adu_logo.png": "adu_logo.png",
    "地学部展示_ロゴ.png": "chigaku_tenji.png",
    "Cooland_ロゴ.png": "cooland.png",
    "AMERICAN CAFE BEN&KEN_ロゴ.png": "ben_ken.png",
    "焼きすぎて麺！_ロゴ.png": "yakisugi.png",
    "ポテトヘッド_ロゴ.png": "potatohead.png",
    "神兵衛_ロゴ.png": "jinbee.png",
    "りすのおうち_ロゴ.png": "risu_house.png",
    "アサノ大全.PNG": "asano_taizen.png",
    "鶏ッピー_ロゴ.jpg": "torippy.jpg",
    "あまねくダンク_ロゴ.png": "amaneku_dunk.png",
    "クイズ研究部.png": "quiz.png",
    "的に当てろ屋_ロゴ.jpg": "matoni_atero.jpg",
    "書道部_ロゴ.png": "shodou.png",
    "棋道部＿ロゴ.png": "kidou.png",
    "登山部 ＿ロゴ.png": "tozambu.png",
    "スクラム食堂_ロゴ.png": "scrum_shokudou.png",
    "aset_logo.png": "aset_logo.png",
    "浅野学園生徒会_ロゴ.png": "asano_seitokai.png",
    "図書委員会古本バザー _ロゴ.png": "furuhon_bazaar.png",
    "KCC_ロゴ.png": "kcc.png",
    "中１学年参加_ロゴ.png": "chu1_gakunen.png",
    "お化け屋敷_ロゴ.png": "obake_yashiki.png",
    "レーザータグ_ロゴ.png": "lasertag.png",
    "総務部門_ロゴ.png": "soumu.png",
    "装飾部門_ロゴ.png": "soushoku.png",
    "浅野同窓会_ロゴ.png": "asano_dousoukai.png",
    "賛助会_ロゴ.png": "sanjokai.png",
    "涼水_ロゴ.png": "ryosui.png"
}

def main():
    if not os.path.exists(TARGET_DIR):
        print(f"❌ エラー: {TARGET_DIR} フォルダーが見つかりません。パスを確認してください。")
        return

    renamed_count = 0
    for old_name, new_name in RENAME_MAP.items():
        old_path = os.path.join(TARGET_DIR, old_name)
        new_path = os.path.join(TARGET_DIR, new_name)

        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            print(f"✅ 変更成功: {old_name} ➔ {new_name}")
            renamed_count += 1

    print(f"\n🎉 完了! {renamed_count} 件のファイル名を安全な英数字に変更しました。")

if __name__ == "__main__":
    main()
