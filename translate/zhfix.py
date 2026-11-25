"""Chinese: redo sentences that stop early, with a minimum length and wider search."""
import sys, json, re, os
sys.stdout.reconfigure(encoding='utf8')
import translate as T
P = os.path.join(T.APP, 'i18n', 'zh-Hant.json'); d = json.load(open(P, encoding='utf8'))
cut = lambda k, v: k != v and len(k) > 25 and re.search(r'[.?!]$', k) and (re.search(r'[,，、;]$', v.strip()) or len(v) < len(k) * .22)
def gen(s, src_len_factor):
    toks = T.tok.encode(s, add_special_tokens=False).tokens
    r = T.tr.translate_batch([['eng_Latn'] + toks + ['</s>']], target_prefix=[['zho_Hant']], beam_size=6, num_hypotheses=6, length_penalty=1.3, min_decoding_length=max(3, int(len(toks) * src_len_factor)), max_decoding_length=220, repetition_penalty=1.1)[0]
    outs = [T.tok.decode([T.tok.token_to_id(t) for t in h if t not in ('</s>', 'zho_Hant')]).strip() for h in r.hypotheses]
    good = [o for o in outs if not re.search(r'[,，、;]$', o) and not re.search(r'(.{3,})\1', o)]
    return (good or [re.sub(r'[,，、;]+$', '。', outs[0])])[0], bool(good)
todo = [k for k, v in d.items() if cut(k, v)]; ok = 0; print(len(todo))
for k in todo:
    parts = []
    for txt, codes, orig in T.pieces(k):
        o, good = gen(txt, .75); f = None if T.bad(txt, o) else T.fix(txt, codes, o)
        if f is None: ptxt, pc, _ = T.pieces(orig, False)[0]; o, good = gen(ptxt, .75); f = T.fix(ptxt, pc, o) or orig
        parts.append(f if re.search(r'[。.!?！？]$', f) else f + '。')
    new = ''.join(parts)
    if sys.argv[1:] == ['show']: print('-', k[:100], '\n   ', d[k], '\n   ', new); ok += 1
    else: d[k] = new
    if sys.argv[1:] == ['show'] and ok > 14: break
if sys.argv[1:] != ['show']: json.dump(d, open(P, 'w', encoding='utf8'), ensure_ascii=False, indent=0); print('left', sum(1 for k, v in d.items() if cut(k, v)))
