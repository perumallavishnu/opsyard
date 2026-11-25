"""Fills opsyard/i18n/<lang>.json (English -> translation) with the local NLLB model. Only missing strings are translated."""
import sys, os
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); HERE = os.path.join(APP, 'translate')
BASE = os.environ.get('OPSYARD_NLLB') or os.path.join(os.path.expanduser('~'), 'opsyard-translate')  # holds model/ and pkgs/, about 1.5 GB
sys.path.insert(0, os.path.join(BASE, 'pkgs'))
import json, re, subprocess, time
import ctranslate2, tokenizers
LANG = {'te': 'tel_Telu', 'hi': 'hin_Deva', 'es': 'spa_Latn', 'fr': 'fra_Latn', 'pt': 'por_Latn', 'de': 'deu_Latn', 'ja': 'jpn_Jpan', 'ko': 'kor_Hang', 'zh-Hant': 'zho_Hant'}
SPLIT = re.compile(r'(?<=[.!?])\s+(?=[A-Z"`*\[(])')
# Names and code-like labels that must stay as they are.
KEEP = set('''Git GitHub GitLab Bitbucket Jenkins Docker Kubernetes Ansible Terraform OpenTofu AWS Linux Ubuntu Kali Jira Confluence Figma Slack Scrum Kanban Scrumban DevOps DevSecOps Agile Waterfall
Pod Dockerfile Jenkinsfile Helm kubectl kubelet kube-proxy etcd containerd runc dockerd Fargate Lambda Nginx nginx Prometheus Grafana Alertmanager CloudWatch CloudTrail GuardDuty DynamoDB Glacier Dependabot CodeQL HEAD main develop origin/main
ReplicaSet StatefulSet DaemonSet CronJob ConfigMap Secret ServiceAccount RoleBinding StorageClass HTTPRoute Gateway Ingress PVC PV HPA CoreDNS JCasC Multibranch Freestyle Compose BuildKit Chrome Metasploitable IAM VPC EC2 S3 EBS EFS RDS SQS SNS ECR ECS EKS ALB NLB GWLB KMS CDK SLI SLO SLA SBOM CVE CVSS SAST SCA DAST OWASP STRIDE TDD XP RAD SAFe LeSS Nexus MFA SSH TCP UDP DNS HTTP HTTPS TLS JQL YAML JSON CI CD CI/CD GitOps SRE DORA CALMS'''.split())
tok = tokenizers.Tokenizer.from_file(os.path.join(BASE, 'model', 'tokenizer.json'))
tr = ctranslate2.Translator(os.path.join(BASE, 'model'), device='cpu', inter_threads=1, intra_threads=8, compute_type='int8')

def run(sents, lang):
    src = [['eng_Latn'] + [t for t in tok.encode(s, add_special_tokens=False).tokens] + ['</s>'] for s in sents]
    out = []
    for r in tr.translate_batch(src, target_prefix=[[lang]] * len(src), beam_size=3, max_batch_size=2048, batch_type='tokens', max_decoding_length=220, no_repeat_ngram_size=4, repetition_penalty=1.05):
        h = r.hypotheses[0]; h = h[1:] if h and h[0] == lang else h
        out.append(tok.decode([tok.token_to_id(t) for t in h if t != '</s>']).strip())
    return out

CODE = re.compile(r'`[^`]+`')
def keep(s):
    w = re.sub(r'[*"]', '', s).strip()
    if len(w.split()) <= 2 and GLOSS.fullmatch(w): return True
    return w in KEEP or not re.search(r'[A-Za-z]{3}', w) or all(x in KEEP or not re.search('[a-z]', x) for x in re.split(r'[\s,/]+', w)) or re.fullmatch(r'[\w./@:=<>-]*[/@=<>_][\w./@:=<>-]*', w)

HAND = {k: v.split('|') for k, v in json.loads(open(os.path.join(HERE, 'hand.json'), encoding='utf8').read()).items()}
GLOSS = re.compile(r"\b(commits|branch(?:es)?|commit|pods?|pull requests?|rebase|stash|forks?|sprints?|backlogs?|epics?|story points?|pipelines?|clusters?|namespaces?|replicas?|rollouts?|rollbacks?|playbooks?|runners?|workflows?|plugins?|webhooks?|subnets?|load balancers?|auto scaling|staging|waterfall|v-model|scrum master|product owner|burndown|daemon|worktrees?|submodules?|reflog|cherry-pick|blue-green|canary|feature flags?|gitops|runbooks?|postmortems?|on-call|sidecars?|taints?|repositor(?:y|ies)|bugs?|merge conflicts?|merge commits?|merge queue|containers?|buckets?|kernel|ReplicaSets?|StatefulSets?|DaemonSets?|ConfigMaps?|Dockerfile|Jenkinsfile)\b", re.I)

def pieces(s, gloss=True):
    """Sentences; inside a sentence code spans become names that survive translation."""
    res = []
    for sent in SPLIT.split(s.replace('**', '')):
        codes = []
        def sub(m): codes.append(m.group()); return f'X{len(codes)}Z'
        t = CODE.sub(sub, sent)
        if gloss:
            n = len(GLOSS.findall(t))
            if 0 < n <= 4: t = GLOSS.sub(sub, t)
        res.append((t, codes, sent))
    return res

def tidy(src, o):
    o = re.sub(r'^[-–]\s+', '', o)
    if not re.search(r'[.!?:…]$', src): o = re.sub(r'[\s.,。،、,]+$', '', o)
    return o

def bad(src, out):
    a, b = max(len(src), 8), len(out)
    return not out or b > a * 3.2 + 12 or '⁇' in out or '<unk>' in out

def fix(src, codes, out):
    for i, c in enumerate(codes, 1):
        m = re.search(rf'[xX]\s?{i}\s?[zZ]', out)
        if not m: return None
        out = out[:m.start()] + c + out[m.end():]
    return None if re.search(r'[xX]\s?\d+\s?[zZ]', out) else out

def main(only=None, limit=None):
    strings = json.loads(subprocess.run(['node', 'strings.js'], cwd=APP, capture_output=True, encoding='utf8', check=True).stdout)
    os.makedirs(os.path.join(APP, 'i18n'), exist_ok=True)
    for code, nl in LANG.items():
        if only and code not in only: continue
        path = os.path.join(APP, 'i18n', code + '.json')
        done = json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}
        for en, vals in HAND.items(): done[en] = vals[list(LANG).index(code)]
        todo = [s for s in strings if s not in done][:limit]
        t0 = time.time(); glue = '' if code in ('ja', 'zh-Hant') else ' '
        for i in range(0, len(todo), 400):
            chunk = todo[i:i + 400]; jobs = []; plan = []
            for s in chunk:
                if keep(s): done[s] = s; plan.append(None); continue
                ps = pieces(s); plan.append((len(jobs), ps)); jobs += [p[0] for p in ps]
            outs = run(jobs, nl) if jobs else []
            for s, pl in zip(chunk, plan):
                if not pl: continue
                parts = []
                for k, (txt, codes, orig) in enumerate(pl[1]):
                    o = outs[pl[0] + k]; f = None if bad(txt, o) else fix(txt, codes, o)
                    if f is None and codes:
                        plain = pieces(orig, False)[0] if len(pieces(orig, False)) == 1 else None
                        if plain and not (len(plain[1]) and plain[0] == txt): o2 = run([plain[0]], nl)[0]; f = None if bad(plain[0], o2) else fix(plain[0], plain[1], o2)
                    if f is None and '`' in orig: # placeholder lost: translate around the code instead
                        bits = CODE.split(orig); ts = iter(run([b for b in bits if re.search('[A-Za-z]{3}', b)] or ['.'], nl)); cs = iter(CODE.findall(orig)); f = ''
                        for b in bits: f += (' ' + next(ts) + ' ' if re.search('[A-Za-z]{3}', b) else b) + next(cs, '')
                        f = re.sub(r'\s+', ' ', f).strip()
                    parts.append(tidy(orig, f) if f else orig)
                done[s] = glue.join(parts)
            tmp = path + '.tmp'
            with open(tmp, 'w', encoding='utf8') as out: json.dump({s: done[s] for s in strings if s in done}, out, ensure_ascii=False, indent=0)
            os.replace(tmp, path)
            print(code, i + len(chunk), '/', len(todo), f'{time.time() - t0:.0f}s', flush=True)
if __name__ == '__main__':
    main(sys.argv[1].split(',') if len(sys.argv) > 1 else None, int(sys.argv[2]) if len(sys.argv) > 2 else None)
    import post  # corrections that must hold after every run
