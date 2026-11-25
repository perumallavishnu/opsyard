"""After a run: corrections that must hold in every language file. Order: te hi es fr pt de ja ko zh-Hant."""
import json, os
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = 'te hi es fr pt de ja ko zh-Hant'.split()
KEEP = ["V-Model", "Spiral", "Waterfall", "Big Bang", "Scrumban", "Pod", "Commit", "Branch", "HEAD", "Docker Compose", "API Gateway"]
SET = {
"Waterfall model": "Waterfall మోడల్|Waterfall मॉडल|Modelo en cascada (Waterfall)|Modèle en cascade (Waterfall)|Modelo cascata (Waterfall)|Wasserfallmodell|ウォーターフォールモデル|폭포수 모델|瀑布模型",
"Spiral model": "స్పైరల్ మోడల్|स्पाइरल मॉडल|Modelo en espiral|Modèle en spirale|Modelo espiral|Spiralmodell|スパイラルモデル|나선형 모델|螺旋模型",
"Prototype model": "ప్రోటోటైప్ మోడల్|प्रोटोटाइप मॉडल|Modelo de prototipos|Modèle par prototypage|Modelo de prototipação|Prototypenmodell|プロトタイプモデル|프로토타입 모델|原型模型",
"Big Bang model": "బిగ్ బ్యాంగ్ మోడల్|बिग बैंग मॉडल|Modelo Big Bang|Modèle Big Bang|Modelo Big Bang|Big-Bang-Modell|ビッグバンモデル|빅뱅 모델|大爆炸模型",
"RAD model": "RAD మోడల్|RAD मॉडल|Modelo RAD|Modèle RAD|Modelo RAD|RAD-Modell|RAD モデル|RAD 모델|RAD 模型",
"Iterative model": "ఇటరేటివ్ మోడల్|इटरेटिव मॉडल|Modelo iterativo|Modèle itératif|Modelo iterativo|Iteratives Modell|反復型モデル|반복 모델|迭代模型",
"Incremental model": "ఇంక్రిమెంటల్ మోడల్|इंक्रीमेंटल मॉडल|Modelo incremental|Modèle incrémental|Modelo incremental|Inkrementelles Modell|インクリメンタルモデル|점증적 모델|增量模型",
"Agile": "Agile (ఎజైల్)|Agile (एजाइल)|Agile (ágil)|Agile|Agile (ágil)|Agil|アジャイル|애자일|敏捷 (Agile)",
"Scrum: the framework": "Scrum: ఫ్రేమ్‌వర్క్|Scrum: ढाँचा|Scrum: el marco|Scrum : le cadre|Scrum: o framework|Scrum: das Rahmenwerk|スクラム: フレームワーク|스크럼: 프레임워크|Scrum：框架",
"bugs, late": "బగ్స్, ఆలస్యం|बग, देरी|errores y retraso|bugs, retard|bugs e atraso|Fehler, zu spät|バグと遅れ|버그와 지연|錯誤與延遲",
"Bug": "బగ్|बग|Error (bug)|Bug|Bug|Fehler (Bug)|バグ|버그|錯誤 (Bug)",
"The life of a bug": "ఒక బగ్ జీవిత చక్రం|एक बग का जीवन|La vida de un error (bug)|La vie d’un bug|A vida de um bug|Das Leben eines Fehlers|バグの一生|버그의 일생|錯誤的一生",
"Software": "సాఫ్ట్‌వేర్|सॉफ़्टवेयर|Software|Logiciel|Software|Software|ソフトウェア|소프트웨어|軟體",
}
for i, l in enumerate(L):
    f = os.path.join(APP, 'i18n', l + '.json')
    d = json.load(open(f, encoding='utf8'))
    for k in KEEP:
        if k in d: d[k] = k
    for k, v in SET.items():
        v = v.split('|'); assert len(v) == 9, k
        if k in d: d[k] = v[i]
    if l == 'ko':
        for k in d:
            if k.startswith('Files in `.github/workflows`'): d[k] = '파일은 `.github/workflows`에 있습니다. 한 job이 다른 job을 `needs`로 지정하지 않으면 동시에 실행됩니다.'
    INSECT = {'hi': [('कीड़ों', 'बग'), ('कीड़े', 'बग'), ('कीड़ा', 'बग'), ('कीड़े', 'बग')], 'es': [('los insectos', 'los errores'), ('insectos', 'errores'), ('insecto', 'error'), ('Insecto', 'Error')], 'fr': [('insectes', 'bugs'), ('insecte', 'bug')], 'pt': [('insetos', 'bugs'), ('inseto', 'bug'), ('Insetos', 'Bugs')], 'de': [('Insekten', 'Fehler'), ('Insekt', 'Fehler'), ('Käfer', 'Fehler')], 'ja': [('昆虫', 'バグ'), ('虫', 'バグ')], 'ko': [('벌레', '버그'), ('곤충', '버그')], 'zh-Hant': [('昆蟲', '錯誤'), ('蟲子', '錯誤'), ('虫子', '錯誤'), ('蟲', '錯誤')], 'te': [('కీటకాలు', 'బగ్స్'), ('పురుగులు', 'బగ్స్'), ('పురుగు', 'బగ్')]}
    for k in d:
        if 'bug' in k.lower() and 'worm' not in k.lower():
            for a, b in INSECT[l]: d[k] = d[k].replace(a, b)
    tmp = f + '.tmp'; json.dump(d, open(tmp, 'w', encoding='utf8'), ensure_ascii=False, indent=0); os.replace(tmp, f)
