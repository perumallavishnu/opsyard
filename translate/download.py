"""Gets the translation model (about 1.4 GB, CC-BY-NC 4.0: non-commercial use only). Run once."""
import sys, os
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); HERE = os.path.join(APP, 'translate')
BASE = os.environ.get('OPSYARD_NLLB') or os.path.join(os.path.expanduser('~'), 'opsyard-translate')  # holds model/ and pkgs/, about 1.5 GB
sys.path.insert(0, os.path.join(BASE, 'pkgs'))
from huggingface_hub import snapshot_download
print(snapshot_download('OpenNMT/nllb-200-distilled-1.3B-ct2-int8', local_dir=os.path.join(BASE, 'model')))
